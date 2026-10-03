import { z } from 'zod';

export const venueTypeSchema = z.enum(['SPORTS', 'HAIRDRESSER', 'FOOTBALL', 'WELLNESS', 'OTHER']);

export const createVenueSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  slug: z.string().min(2, 'Le slug doit contenir au moins 2 caractères'),
  type: venueTypeSchema,
  description: z.string().optional(),
  address: z.string().min(3, 'L\'adresse est requise'),
  city: z.string().min(2, 'La ville est requise'),
  timezone: z.string().default('Africa/Casablanca'),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const updateVenueSchema = createVenueSchema.partial();

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Le nom de la ressource est requis'),
  venueId: z.string().uuid(),
  description: z.string().optional(),
  slotDurationMinutes: z.enum(['30', '60', '90']).transform(Number).or(z.number().refine(n => [30, 60, 90].includes(n))),
  priceCents: z.number().int().nonnegative('Le prix doit être positif'),
  currency: z.string().default('EUR'),
  isActive: z.boolean().default(true),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createOpeningRuleSchema = z.object({
  resourceId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday, 1=Monday ... 6=Saturday
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:mm attendu'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:mm attendu'),
});

export const createClosureExceptionSchema = z.object({
  resourceId: z.string().uuid(),
  startDate: z.string().datetime().or(z.string()),
  endDate: z.string().datetime().or(z.string()),
  reason: z.string().optional(),
});

export type VenueType = z.infer<typeof venueTypeSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateOpeningRuleInput = z.infer<typeof createOpeningRuleSchema>;
export type CreateClosureExceptionInput = z.infer<typeof createClosureExceptionSchema>;
