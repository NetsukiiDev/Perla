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
