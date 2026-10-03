import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { AvailabilityService } from './availability.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VenuesController],
  providers: [VenuesService, AvailabilityService],
  exports: [VenuesService, AvailabilityService],
})
export class VenuesModule {}
