import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { VenueType, BookingStatus } from '@prisma/client';

@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async findAllVenues(params?: { type?: VenueType; city?: string; query?: string }) {
    const where: any = {};

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }

    if (params?.query) {
      where.OR = [
        { name: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { city: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.venue.findMany({
      where,
      include: {
        resources: {
          where: { isActive: true },
          select: { id: true, name: true, slotDurationMinutes: true, priceCents: true, currency: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findVenueBySlug(slug: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      include: {
        resources: {
          where: { isActive: true },
          include: {
            openingRules: true,
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException(`Établissement introuvable pour le slug "${slug}"`);
    }

    return venue;
  }

  async findResourceById(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        venue: true,
        openingRules: true,
        closureExceptions: true,
      },
    });

    if (!resource) {
      throw new NotFoundException(`Ressource introuvable`);
    }

    return resource;
  }

  async getResourceAvailability(resourceId: string, fromIso: string, toIso: string, currentUserId?: string) {
    const resource = await this.findResourceById(resourceId);

    const fromUtc = new Date(fromIso);
    const toUtc = new Date(toIso);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        startAt: { lt: toUtc },
        endAt: { gt: fromUtc },
      },
    });

    return this.availabilityService.calculateSlots({
      timezone: resource.venue.timezone,
      slotDurationMinutes: resource.slotDurationMinutes,
      priceCents: resource.priceCents,
      currency: resource.currency,
      openingRules: resource.openingRules,
      closureExceptions: resource.closureExceptions,
      existingBookings,
      fromUtc,
      toUtc,
      currentUserId,
    });
  }
}
