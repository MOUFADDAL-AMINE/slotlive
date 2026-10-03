import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addMinutes, parse, format, isBefore, isAfter, isEqual } from 'date-fns';

export interface SlotResult {
  startAt: string; // ISO UTC
  endAt: string;   // ISO UTC
  localStart: string; // HH:mm
  localEnd: string;   // HH:mm
  status: 'FREE' | 'HELD_BY_ME' | 'HELD_BY_OTHER' | 'RESERVED' | 'PAST';
  holdExpiresAt?: string;
  priceCents: number;
  currency: string;
}

@Injectable()
export class AvailabilityService {
  /**
   * Generates discrete slots for a resource between fromDate and toDate.
   */
  calculateSlots(params: {
    timezone: string;
    slotDurationMinutes: number;
    priceCents: number;
    currency: string;
    openingRules: Array<{ dayOfWeek: number; openTime: string; closeTime: string }>;
    closureExceptions: Array<{ startDate: Date; endDate: Date }>;
    existingBookings: Array<{
      id: string;
      userId: string;
      startAt: Date;
      endAt: Date;
      status: BookingStatus;
      holdExpiresAt: Date | null;
    }>;
    fromUtc: Date;
    toUtc: Date;
    currentUserId?: string;
    nowUtc?: Date;
  }): SlotResult[] {
    const {
      timezone,
      slotDurationMinutes,
      priceCents,
      currency,
      openingRules,
      closureExceptions,
      existingBookings,
      fromUtc,
      toUtc,
      currentUserId,
      nowUtc = new Date(),
    } = params;

    const slots: SlotResult[] = [];

    // Convert fromUtc and toUtc to zoned dates for iteration day-by-day
    const fromZoned = toZonedTime(fromUtc, timezone);
    const toZoned = toZonedTime(toUtc, timezone);

    let currentDayZoned = new Date(fromZoned.getFullYear(), fromZoned.getMonth(), fromZoned.getDate());
    const endDayZoned = new Date(toZoned.getFullYear(), toZoned.getMonth(), toZoned.getDate());

    while (currentDayZoned <= endDayZoned) {
      const dayOfWeek = currentDayZoned.getDay(); // 0=Sun, 1=Mon ... 6=Sat

      // Find matching opening rules for this day of week
      const dayRules = openingRules.filter((r) => r.dayOfWeek === dayOfWeek);

      for (const rule of dayRules) {
        // Parse HH:mm in local time
        const [openH, openM] = rule.openTime.split(':').map(Number);
        const [closeH, closeM] = rule.closeTime.split(':').map(Number);

        const openZoned = new Date(
          currentDayZoned.getFullYear(),
          currentDayZoned.getMonth(),
          currentDayZoned.getDate(),
          openH,
          openM,
          0,
        );

        const closeZoned = new Date(
          currentDayZoned.getFullYear(),
          currentDayZoned.getMonth(),
          currentDayZoned.getDate(),
          closeH,
          closeM,
          0,
        );

        let slotStartZoned = openZoned;

        while (addMinutes(slotStartZoned, slotDurationMinutes) <= closeZoned) {
          const slotEndZoned = addMinutes(slotStartZoned, slotDurationMinutes);

          // Convert back to UTC for database comparison & API output
          const slotStartUtc = fromZonedTime(slotStartZoned, timezone);
          const slotEndUtc = fromZonedTime(slotEndZoned, timezone);

          // Check if slot falls inside range requested
          if (slotStartUtc >= fromUtc && slotEndUtc <= toUtc) {
            // Check closure exceptions
            const isClosed = closureExceptions.some(
              (ex) =>
                (slotStartUtc >= ex.startDate && slotStartUtc < ex.endDate) ||
                (slotEndUtc > ex.startDate && slotEndUtc <= ex.endDate),
            );

            if (!isClosed) {
              const status = this.determineSlotStatus({
                slotStartUtc,
                slotEndUtc,
                existingBookings,
                currentUserId,
                nowUtc,
              });

              slots.push({
                startAt: slotStartUtc.toISOString(),
                endAt: slotEndUtc.toISOString(),
                localStart: format(slotStartZoned, 'HH:mm'),
                localEnd: format(slotEndZoned, 'HH:mm'),
                status: status.status,
                holdExpiresAt: status.holdExpiresAt?.toISOString(),
                priceCents,
                currency,
              });
            }
          }

          slotStartZoned = slotEndZoned;
        }
      }

      currentDayZoned = new Date(currentDayZoned.getFullYear(), currentDayZoned.getMonth(), currentDayZoned.getDate() + 1);
    }

    return slots;
  }

  private determineSlotStatus(params: {
    slotStartUtc: Date;
    slotEndUtc: Date;
    existingBookings: Array<{
      id: string;
      userId: string;
      startAt: Date;
      endAt: Date;
      status: BookingStatus;
      holdExpiresAt: Date | null;
    }>;
    currentUserId?: string;
    nowUtc: Date;
  }): { status: SlotResult['status']; holdExpiresAt?: Date } {
    const { slotStartUtc, slotEndUtc, existingBookings, currentUserId, nowUtc } = params;

    // 1. Past slot check
    if (slotEndUtc <= nowUtc) {
      return { status: 'PAST' };
    }

    // 2. Matching booking overlap check
    const match = existingBookings.find(
      (b) =>
        b.status !== BookingStatus.CANCELLED &&
        b.status !== BookingStatus.EXPIRED &&
        ((slotStartUtc >= b.startAt && slotStartUtc < b.endAt) ||
          (slotEndUtc > b.startAt && slotEndUtc <= b.endAt) ||
          (b.startAt >= slotStartUtc && b.endAt <= slotEndUtc)),
    );

    if (!match) {
      return { status: 'FREE' };
    }

    if (match.status === BookingStatus.CONFIRMED || match.status === BookingStatus.COMPLETED) {
      return { status: 'RESERVED' };
    }

    if (match.status === BookingStatus.HELD) {
      // Check hold expiration
      if (match.holdExpiresAt && match.holdExpiresAt <= nowUtc) {
        return { status: 'FREE' }; // Expired hold
      }

      if (currentUserId && match.userId === currentUserId) {
        return { status: 'HELD_BY_ME', holdExpiresAt: match.holdExpiresAt || undefined };
      }

      return { status: 'HELD_BY_OTHER', holdExpiresAt: match.holdExpiresAt || undefined };
    }

    return { status: 'FREE' };
  }
}
