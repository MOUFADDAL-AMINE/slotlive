import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingExpirationProcessor, BOOKING_EXPIRATION_QUEUE } from './booking-expiration.processor';
import { VenuesModule } from '../venues/venues.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    VenuesModule,
    BullModule.registerQueue({
      name: BOOKING_EXPIRATION_QUEUE,
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
