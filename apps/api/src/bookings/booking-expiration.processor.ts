import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

export const BOOKING_EXPIRATION_QUEUE = 'booking-expiration';

@Processor(BOOKING_EXPIRATION_QUEUE)
@Injectable()
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ bookingId?: string }>): Promise<void> {
    this.logger.debug(`Processing expiration job: ${job.name} (${job.id})`);

    const now = new Date();

    if (job.data?.bookingId) {
      // Single booking expiration task
      const booking = await this.prisma.booking.findUnique({
        where: { id: job.data.bookingId },
      });

      if (booking && booking.status === BookingStatus.HELD && booking.holdExpiresAt && booking.holdExpiresAt <= now) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED },
        });
        this.logger.log(`Booking ${booking.id} expired.`);
      }
    } else {
      // Periodic cleanup sweep
      const expiredCount = await this.prisma.booking.updateMany({
        where: {
          status: BookingStatus.HELD,
          holdExpiresAt: { lte: now },
        },
        data: {
          status: BookingStatus.EXPIRED,
        },
      });

      if (expiredCount.count > 0) {
        this.logger.log(`Swept and expired ${expiredCount.count} held bookings.`);
      }
    }
  }
}
