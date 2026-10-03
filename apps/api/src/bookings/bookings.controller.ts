import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateHoldInput, CancelBookingInput, createHoldSchema, cancelBookingSchema } from '@slotlive/shared';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Hold a slot for 10 minutes (Concurrency Protected)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique idempotency key' })
  async createHold(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CreateHoldInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const validated = createHoldSchema.parse(body);
    return this.bookingsService.createHold(user.userId, validated, idempotencyKey);
  }

  @Get('me/bookings')
  @ApiOperation({ summary: 'List current user bookings' })
  async getMyBookings(@CurrentUser() user: CurrentUserPayload) {
    return this.bookingsService.getUserBookings(user.userId);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  async getBooking(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.bookingsService.getBookingById(id, user.userId);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body?: CancelBookingInput,
  ) {
    const validated = body ? cancelBookingSchema.parse(body) : {};
    return this.bookingsService.cancelBooking(user.userId, id, validated.reason);
  }
}
