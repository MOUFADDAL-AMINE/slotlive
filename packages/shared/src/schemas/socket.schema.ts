import { z } from 'zod';
import { bookingStatusSchema } from './booking.schema.js';

export const slotEventPayloadSchema = z.object({
  resourceId: z.string().uuid(),
  bookingId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  userId: z.string().uuid().optional(),
});

export type SlotEventPayload = z.infer<typeof slotEventPayloadSchema>;

export interface ServerToClientEvents {
  'slot.held': (payload: SlotEventPayload) => void;
  'slot.released': (payload: SlotEventPayload) => void;
  'slot.confirmed': (payload: SlotEventPayload) => void;
  'slot.cancelled': (payload: SlotEventPayload) => void;
  'resource.updated': (payload: { resourceId: string }) => void;
}

export interface ClientToServerEvents {
  'subscribe:resource': (resourceId: string) => void;
  'unsubscribe:resource': (resourceId: string) => void;
}
