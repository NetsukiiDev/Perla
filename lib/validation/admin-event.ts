import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

const dateInput = z.union([z.string().trim().min(1), z.number(), z.date()]).pipe(z.coerce.date());
const nullableDateInput = dateInput.optional().nullable();

const eventBaseSchema = z.object({
  internalName: z.string().trim().min(1).max(200),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  revealAt: nullableDateInput,
  startsAt: dateInput,
  endsAt: nullableDateInput,
  stepsCount: z.coerce.number().int().min(1).max(50).default(6),
  unlockRadiusM: z.coerce.number().int().min(5).max(5000).default(100),
  showTotalDistance: z.boolean().default(true),
  showTotalDuration: z.boolean().default(true),
  showTollInfo: z.boolean().default(false),
  notes: z.string().max(5000).optional().nullable(),
});

export function eventCreateSchema(t: Dictionary) {
  return eventBaseSchema
    .refine((d) => !d.endsAt || d.endsAt.getTime() > d.startsAt.getTime(), {
      message: t.validation.event.endAfterStart,
      path: ["endsAt"],
    });
}

export function eventUpdateSchema(t: Dictionary) {
  return eventBaseSchema
    .partial()
    .extend({
      status: z.enum(["draft", "scheduled", "active", "closed", "archived"]).optional(),
    })
    .refine((d) => !d.startsAt || !d.endsAt || d.endsAt.getTime() > d.startsAt.getTime(), {
      message: t.validation.event.endAfterStart,
      path: ["endsAt"],
    });
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

// `image` is an optional data URL ("data:<mime>;base64,..."). The API decodes
// and stores the raw bytes; an empty/invalid value means "no image".
export const announcementSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  image: z
    .string()
    .max(MAX_IMAGE_BYTES * 4 / 3 + 100)
    .optional()
    .nullable()
    .refine(
      (v) => {
        if (!v) return true;
        const match = /^data:(image\/[a-z0-9.+-]+);base64,/.exec(v);
        if (!match) return false;
        if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(match[1])) return false;
        const bytes = Math.ceil((v.length - match[0].length) * 3 / 4);
        return bytes <= MAX_IMAGE_BYTES;
      },
      { message: "invalid_image" },
    ),
});

export const ANNOUNCEMENT_MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
