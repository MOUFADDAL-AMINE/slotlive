import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from './bookings.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaMock: any;
  let redisMock: any;
  let availabilityMock: any;
  let eventsMock: any;
  let queueMock: any;

  beforeEach(() => {
    prismaMock = {
      resource: { findUnique: vi.fn() },
      booking: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
      openingRule: { findMany: vi.fn().mockResolvedValue([]) },
      closureException: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
      }),
    };

    availabilityMock = {
      calculateSlots: vi.fn().mockReturnValue([]),
    };

    eventsMock = {
      emitSlotHeld: vi.fn(),
      emitSlotReleased: vi.fn(),
      emitSlotConfirmed: vi.fn(),
      emitSlotCancelled: vi.fn(),
    };

    queueMock = {
      add: vi.fn().mockResolvedValue(true),
    };

    service = new BookingsService(
      prismaMock as any,
      redisMock as any,
      availabilityMock as any,
      eventsMock as any,
      queueMock as any,
    );
  });

  it('should throw NotFoundException if resource does not exist', async () => {
    prismaMock.resource.findUnique.mockResolvedValue(null);

    await expect(
      service.createHold('user-1', {
        resourceId: 'b783457a-7bf4-4903-a1f7-e7d6ed15f011',
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a HELD booking and schedule expiration job & emit slot.held', async () => {
    const resource = {
      id: 'b783457a-7bf4-4903-a1f7-e7d6ed15f011',
      isActive: true,
      priceCents: 3000,
      currency: 'EUR',
      venue: { timezone: 'Europe/Paris' },
    };
    prismaMock.resource.findUnique.mockResolvedValue(resource);

    const createdBooking = {
      id: 'booking-uuid',
      userId: 'user-1',
      resourceId: resource.id,
      status: BookingStatus.HELD,
      priceCents: 3000,
      currency: 'EUR',
    };
    prismaMock.booking.create.mockResolvedValue(createdBooking);

    const res = await service.createHold('user-1', {
      resourceId: resource.id,
      startAt: new Date(Date.now() + 3600000).toISOString(),
      endAt: new Date(Date.now() + 7200000).toISOString(),
    });

    expect(res.id).toBe('booking-uuid');
    expect(queueMock.add).toHaveBeenCalledWith('expire-hold', { bookingId: 'booking-uuid' }, expect.any(Object));
    expect(eventsMock.emitSlotHeld).toHaveBeenCalledWith(resource.id, expect.any(Object));
  });
});
