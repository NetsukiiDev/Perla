import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri"),
});

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  role: z.enum(["admin", "staff"]),
});

export const updateUserSchema = z
  .object({
    role: z.enum(["admin", "staff"]).optional(),
    newPassword: z.string().min(8, "La password deve avere almeno 8 caratteri").optional(),
  })
  .refine((d) => d.role !== undefined || d.newPassword !== undefined, {
    message: "Nessuna modifica fornita.",
  });
