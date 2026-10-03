import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('bookings/:id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe Checkout Session for held booking' })
  async createCheckoutSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') bookingId: string,
  ) {
    return this.paymentsService.createCheckoutSession(user.userId, bookingId);
  }
}
