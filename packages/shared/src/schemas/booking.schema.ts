import { z } from 'zod';

export const bookingStatusSchema = z.enum([
  'HELD',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
]);

export const createHoldSchema = z.object({
  resourceId: z.string().uuid('ID de ressource invalide'),
  startAt: z.string().datetime('Format ISO 8601 UTC requis (ex: 2026-10-10T10:00:00.000Z)'),
  endAt: z.string().datetime('Format ISO 8601 UTC requis (ex: 2026-10-10T11:00:00.000Z)'),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const queryAvailabilitySchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type CreateHoldInput = z.infer<typeof createHoldSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type QueryAvailabilityInput = z.infer<typeof queryAvailabilitySchema>;
