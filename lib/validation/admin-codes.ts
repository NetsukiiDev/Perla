import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

const dateInput = z.union([z.string().trim().min(1), z.number(), z.date()]).pipe(z.coerce.date());

export const codeGenerateSchema = z.object({
  participantId: z.string().min(1),
  expiresAt: dateInput.optional().nullable(),
  maxSessions: z.coerce.number().int().min(1).max(1).optional(),
});

// Public code: event-level, reusable by many guests, no expiry. maxSessions
// is the usage cap (how many guests may start it).
export const codePublicCreateSchema = z.object({
  eventId: z.string().min(1),
  maxSessions: z.coerce.number().int().min(1).max(10000).default(100),
});

// Custom code set by an admin. Normalized (uppercase, no spaces) server-side.
export function codeUpdateSchema(t: Dictionary) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(4, t.validation.codes.minLength)
      .max(32)
      .regex(/^[A-Za-z0-9\s-]+$/, t.validation.codes.pattern),
  });
}

export const codeStatusUpdateSchema = z.object({
  active: z.boolean(),
});

export const codeBulkDeleteSchema = z.object({
  eventId: z.string().min(1),
  codeIds: z.array(z.string().min(1)).min(1).max(500),
});
