import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let configMock: any;
  let eventsMock: any;

  beforeEach(() => {
    prismaMock = {
      booking: { findUnique: vi.fn(), update: vi.fn() },
      payment: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      stripeEvent: { findUnique: vi.fn(), create: vi.fn() },
    };

    configMock = {
      get: vi.fn((key: string, defaultValue?: string) => defaultValue || 'mock_secret'),
    };

    eventsMock = {
      emitSlotConfirmed: vi.fn(),
    };

    service = new PaymentsService(prismaMock as any, configMock as any, eventsMock as any);
  });

  it('should throw NotFoundException if booking is not found', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    await expect(service.createCheckoutSession('user-1', 'booking-123')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if hold has expired', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-123',
      userId: 'user-1',
      status: BookingStatus.HELD,
      holdExpiresAt: new Date(Date.now() - 60000), // expired 1 min ago
      resource: { venue: { slug: 'fitzone' } },
    });

    await expect(service.createCheckoutSession('user-1', 'booking-123')).rejects.toThrow(BadRequestException);
  });

  it('should ignore duplicate stripe webhook events via idempotency check', async () => {
    prismaMock.stripeEvent.findUnique.mockResolvedValue({ id: 'evt_123', stripeEventId: 'evt_123' });

    const rawBody = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' }));
    const result = await service.handleStripeWebhook('sig_123', rawBody);

    expect(result).toEqual({ received: true });
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });
});
