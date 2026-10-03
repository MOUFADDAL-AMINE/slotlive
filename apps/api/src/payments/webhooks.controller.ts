import { Controller, Post, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe Webhook handler with signature verification' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    // In express, raw body is passed or req.body if raw middleware configured
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    return this.paymentsService.handleStripeWebhook(signature || '', rawBody);
  }
}
