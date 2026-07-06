import { z } from "zod";

const dateInput = z.union([z.string().trim().min(1), z.number(), z.date()]).pipe(z.coerce.date());

export const codeGenerateSchema = z.object({
  participantId: z.string().min(1),
  expiresAt: dateInput.optional().nullable(),
  maxSessions: z.coerce.number().int().min(1).max(1).optional(),
});

// Custom code set by an admin. Normalized (uppercase, no spaces) server-side.
export const codeUpdateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Il codice deve avere almeno 4 caratteri")
    .max(32)
    .regex(/^[A-Za-z0-9\s-]+$/, "Solo lettere, numeri, spazi e trattini"),
});

export const codeStatusUpdateSchema = z.object({
  active: z.boolean(),
});

export const codeBulkDeleteSchema = z.object({
  eventId: z.string().min(1),
  codeIds: z.array(z.string().min(1)).min(1).max(500),
});
