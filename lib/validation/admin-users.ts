import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

export function changePasswordSchema(t: Dictionary) {
  return z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, t.validation.users.passwordLength),
  });
}

export function createUserSchema(t: Dictionary) {
  return z.object({
    email: z.string().trim().email(),
    password: z.string().min(8, t.validation.users.passwordLength),
    role: z.enum(["admin", "organizer"]),
  });
}

export function updateUserSchema(t: Dictionary) {
  return z
    .object({
      role: z.enum(["admin", "organizer"]).optional(),
      newPassword: z.string().min(8, t.validation.users.passwordLength).optional(),
    })
    .refine((d) => d.role !== undefined || d.newPassword !== undefined, {
      message: t.validation.users.noChanges,
    });
}
