import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { BookingStatus } from '@prisma/client';

export const BOOKING_EXPIRATION_QUEUE = 'booking-expiration';

@Processor(BOOKING_EXPIRATION_QUEUE)
@Injectable()
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<{ bookingId?: string }>): Promise<void> {
    this.logger.debug(`Processing expiration job: ${job.name} (${job.id})`);

    const now = new Date();

    if (job.data?.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: job.data.bookingId },
      });

      if (booking && booking.status === BookingStatus.HELD && booking.holdExpiresAt && booking.holdExpiresAt <= now) {
        const updated = await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED },
        });

        this.eventsGateway.emitSlotReleased(booking.resourceId, {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          status: 'EXPIRED',
          userId: booking.userId,
        });

        this.logger.log(`Booking ${booking.id} expired & released.`);
      }
    } else {
      const heldBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.HELD,
          holdExpiresAt: { lte: now },
        },
      });

      for (const booking of heldBookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED },
        });

        this.eventsGateway.emitSlotReleased(booking.resourceId, {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          status: 'EXPIRED',
          userId: booking.userId,
        });
      }

      if (heldBookings.length > 0) {
        this.logger.log(`Swept and expired ${heldBookings.length} held bookings.`);
      }
    }
  }
}
