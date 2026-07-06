import { z } from "zod";

export const participantCreateSchema = z.object({
  eventId: z.string().min(1),
  displayName: z.string().trim().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const participantBulkCreateSchema = z.object({
  eventId: z.string().min(1),
  count: z.coerce.number().int().min(1).max(200),
  displayNamePrefix: z.string().trim().max(80).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const participantUpdateSchema = z.object({
  displayName: z.string().trim().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z
    .enum(["not_started", "opened_site", "started", "in_progress", "arrived", "blocked", "deleted"])
    .optional(),
});
