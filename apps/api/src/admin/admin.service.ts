import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { CreateVenueInput, CreateResourceInput } from '@slotlive/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const totalBookings = await this.prisma.booking.count();
    const confirmedBookings = await this.prisma.booking.count({
      where: { status: BookingStatus.CONFIRMED },
    });

    const revenueResult = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: { amountCents: true },
    });

    const totalRevenueCents = revenueResult._sum.amountCents || 0;

    // Daily bookings for last 7 days chart
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentBookings = await this.prisma.booking.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true, priceCents: true },
    });

    // Group bookings by day
    const dailyMap: Record<string, { date: string; bookings: number; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { date: dateStr, bookings: 0, revenue: 0 };
    }

    recentBookings.forEach((b) => {
      const dateStr = b.createdAt.toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].bookings += 1;
        if (b.status === BookingStatus.CONFIRMED) {
          dailyMap[dateStr].revenue += b.priceCents / 100;
        }
      }
    });

    const dailyStats = Object.values(dailyMap);

    return {
      totalBookings,
      confirmedBookings,
      totalRevenueCents,
      occupancyRatePercent: totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0,
      dailyStats,
    };
  }

  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        resource: { include: { venue: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createVenue(dto: CreateVenueInput) {
    return this.prisma.venue.create({
      data: dto as any,
    });
  }

  async createResource(dto: CreateResourceInput) {
    return this.prisma.resource.create({
      data: dto as any,
    });
  }

  async manualCancelBooking(bookingId: string, adminUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable.');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADMIN_MANUAL_CANCEL',
        entityType: 'Booking',
        entityId: bookingId,
      },
    });

    return updated;
  }

  async exportBookingsCsv(): Promise<string> {
    const bookings = await this.prisma.booking.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        resource: { include: { venue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID,Client,Email,Etablissement,Ressource,Debut_UTC,Fin_UTC,Statut,Prix_EUR\n';
    const rows = bookings.map((b) => {
      const clientName = `"${b.user.firstName} ${b.user.lastName}"`;
      const venueName = `"${b.resource.venue.name}"`;
      const resourceName = `"${b.resource.name}"`;
      return `${b.id},${clientName},${b.user.email},${venueName},${resourceName},${b.startAt.toISOString()},${b.endAt.toISOString()},${b.status},${b.priceCents / 100}`;
    });

    return header + rows.join('\n');
  }
}
