import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AvailabilityService } from '../venues/availability.service';
import { EventsGateway } from '../events/events.gateway';
import { BookingStatus, Prisma } from '@prisma/client';
import { CreateHoldInput } from '@slotlive/shared';
import { BOOKING_EXPIRATION_QUEUE } from './booking-expiration.processor';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly availabilityService: AvailabilityService,
    private readonly eventsGateway: EventsGateway,
    @InjectQueue(BOOKING_EXPIRATION_QUEUE)
    private readonly expirationQueue: Queue,
  ) {}

  async createHold(userId: string, dto: CreateHoldInput, idempotencyKey?: string) {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const redis = this.redisService.getClient();
      const existingBookingId = await redis.get(`idempotency:${idempotencyKey}`);
      if (existingBookingId) {
        this.logger.log(`Idempotency key hit: ${idempotencyKey} -> ${existingBookingId}`);
        return this.getBookingById(existingBookingId, userId);
      }
    }

    const resource = await this.prisma.resource.findUnique({
      where: { id: dto.resourceId },
      include: { venue: true },
    });

    if (!resource || !resource.isActive) {
      throw new NotFoundException('Ressource introuvable ou inactive.');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const now = new Date();

    if (startAt <= now) {
      throw new BadRequestException('Impossible de réserver un créneau dans le passé.');
    }

    const holdExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes hold

    try {
      // 2. Database Transaction with PostgreSQL Exclusion Constraint Defense
      const booking = await this.prisma.$transaction(async (tx) => {
        return tx.booking.create({
          data: {
            userId,
            resourceId: resource.id,
            startAt,
            endAt,
            status: BookingStatus.HELD,
            holdExpiresAt,
            priceCents: resource.priceCents,
            currency: resource.currency,
          },
        });
      });

      // 3. Cache Idempotency Key
      if (idempotencyKey) {
        const redis = this.redisService.getClient();
        await redis.set(`idempotency:${idempotencyKey}`, booking.id, 'EX', 600); // 10 mins
      }

      // 4. Schedule BullMQ Expiration Job (delayed 10 mins)
      await this.expirationQueue.add(
        'expire-hold',
        { bookingId: booking.id },
        { delay: 10 * 60 * 1000, removeOnComplete: true },
      );

      // 5. Real-time WebSocket Event Broadcast
      this.eventsGateway.emitSlotHeld(resource.id, {
        resourceId: resource.id,
        bookingId: booking.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: 'HELD',
        userId,
      });

      return booking;
    } catch (error) {
      // Catch PostgreSQL Exclusion Constraint Violation (23P01) or Prisma error (P2004/P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        (error as any)?.code === '23P01' ||
        (error as any)?.message?.includes('no_overlapping_bookings') ||
        (error as any)?.message?.includes('exclusion constraint')
      ) {
        this.logger.warn(`Slot conflict detected for resource ${resource.id} at ${startAt.toISOString()}`);

        const nearbyFrom = new Date(startAt.getTime() - 2 * 60 * 60 * 1000);
        const nearbyTo = new Date(endAt.getTime() + 2 * 60 * 60 * 1000);

        const nearbySlots = await this.availabilityService.calculateSlots({
          timezone: resource.venue.timezone,
          slotDurationMinutes: resource.slotDurationMinutes,
          priceCents: resource.priceCents,
          currency: resource.currency,
          openingRules: await this.prisma.openingRule.findMany({ where: { resourceId: resource.id } }),
          closureExceptions: await this.prisma.closureException.findMany({ where: { resourceId: resource.id } }),
          existingBookings: await this.prisma.booking.findMany({
            where: {
              resourceId: resource.id,
              status: { in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
            },
          }),
          fromUtc: nearbyFrom,
          toUtc: nearbyTo,
        });

        const availableNearby = nearbySlots
          .filter((s) => s.status === 'FREE')
          .slice(0, 3);

        throw new ConflictException({
          statusCode: 409,
          code: 'SLOT_UNAVAILABLE',
          message: "Ce créneau vient d'être pris. Voici des créneaux proches disponibles :",
          details: { nearbySlots: availableNearby },
        });
      }

      throw error;
    }
  }

  async getBookingById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: {
          include: { venue: true },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable.');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('Accès non autorisé à cette réservation.');
    }

    return booking;
  }

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        resource: {
          include: { venue: true },
        },
        payment: true,
      },
      orderBy: { startAt: 'desc' },
    });
  }

  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await this.getBookingById(bookingId, userId);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cette réservation est déjà annulée.');
    }

    const now = new Date();
    const hoursBeforeStart = (booking.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isEligibleForRefund = hoursBeforeStart >= 24;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    // Real-time broadcast
    this.eventsGateway.emitSlotCancelled(booking.resourceId, {
      resourceId: booking.resourceId,
      bookingId: booking.id,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: 'CANCELLED',
      userId,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: booking.id,
        details: { reason, hoursBeforeStart, isEligibleForRefund },
      },
    });

    return {
      booking: updated,
      isEligibleForRefund,
      message: isEligibleForRefund
        ? 'Réservation annulée. Vous recevrez un remboursement sous 3-5 jours ouvrés.'
        : 'Réservation annulée. Conformément à la politique (moins de 24h avant), aucun remboursement n\'est effectué.',
    };
  }
}
