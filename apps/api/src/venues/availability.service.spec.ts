import { describe, it, expect, beforeEach } from 'vitest';
import { AvailabilityService } from './availability.service';
import { BookingStatus } from '@prisma/client';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(() => {
    service = new AvailabilityService();
  });

  it('should generate slots according to opening rules and timezone', () => {
    const openingRules = [{ dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' }]; // Monday
    const fromUtc = new Date('2026-10-12T00:00:00.000Z'); // Monday UTC
    const toUtc = new Date('2026-10-12T23:59:59.000Z');
    const nowUtc = new Date('2026-10-01T00:00:00.000Z'); // past reference date

    const slots = service.calculateSlots({
      timezone: 'Europe/Paris',
      slotDurationMinutes: 60,
      priceCents: 2000,
      currency: 'EUR',
      openingRules,
      closureExceptions: [],
      existingBookings: [],
      fromUtc,
      toUtc,
      nowUtc,
    });

    // 09:00-10:00, 10:00-11:00, 11:00-12:00 = 3 slots
    expect(slots.length).toBe(3);
    expect(slots[0].localStart).toBe('09:00');
    expect(slots[0].localEnd).toBe('10:00');
    expect(slots[0].status).toBe('FREE');
  });

  it('should correctly mark existing CONFIRMED booking as RESERVED', () => {
    const openingRules = [{ dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' }];
    const fromUtc = new Date('2026-10-12T00:00:00.000Z');
    const toUtc = new Date('2026-10-12T23:59:59.000Z');
    const nowUtc = new Date('2026-10-01T00:00:00.000Z');

    const bookingStart = new Date('2026-10-12T08:00:00.000Z'); // 10:00 Paris local
    const bookingEnd = new Date('2026-10-12T09:00:00.000Z');   // 11:00 Paris local

    const slots = service.calculateSlots({
      timezone: 'Europe/Paris',
      slotDurationMinutes: 60,
      priceCents: 2000,
      currency: 'EUR',
      openingRules,
      closureExceptions: [],
      existingBookings: [
        {
          id: 'booking-1',
          userId: 'user-1',
          startAt: bookingStart,
          endAt: bookingEnd,
          status: BookingStatus.CONFIRMED,
          holdExpiresAt: null,
        },
      ],
      fromUtc,
      toUtc,
      nowUtc,
    });

    const reservedSlot = slots.find((s) => s.localStart === '10:00');
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot?.status).toBe('RESERVED');
  });

  it('should differentiate HELD_BY_ME vs HELD_BY_OTHER', () => {
    const openingRules = [{ dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' }];
    const fromUtc = new Date('2026-10-12T00:00:00.000Z');
    const toUtc = new Date('2026-10-12T23:59:59.000Z');
    const nowUtc = new Date('2026-10-01T00:00:00.000Z');

    const bookingStart = new Date('2026-10-12T07:00:00.000Z'); // 09:00 Paris local
    const bookingEnd = new Date('2026-10-12T08:00:00.000Z');

    const slots = service.calculateSlots({
      timezone: 'Europe/Paris',
      slotDurationMinutes: 60,
      priceCents: 2000,
      currency: 'EUR',
      openingRules,
      closureExceptions: [],
      existingBookings: [
        {
          id: 'booking-1',
          userId: 'my-user-id',
          startAt: bookingStart,
          endAt: bookingEnd,
          status: BookingStatus.HELD,
          holdExpiresAt: new Date('2026-10-12T08:10:00.000Z'),
        },
      ],
      fromUtc,
      toUtc,
      currentUserId: 'my-user-id',
      nowUtc,
    });

    expect(slots[0].status).toBe('HELD_BY_ME');
  });
});
