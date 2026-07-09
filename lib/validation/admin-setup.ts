import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

export function setupDatabaseSchema(t: Dictionary) {
  return z
    .object({
      provider: z.enum(["postgresql", "mysql", "mariadb", "mongodb"]),
      url: z.string().trim().min(1).optional(),
      host: z.string().trim().optional(),
      port: z.coerce.number().int().positive().max(65535).optional(),
      user: z.string().trim().optional(),
      password: z.string().optional(),
      database: z.string().trim().optional(),
    })
    .refine((d) => Boolean(d.url) || Boolean(d.host && d.user && d.database), {
      message: t.validation.setup.connectionRequired,
    });
}

export function adminSetupSchema(t: Dictionary) {
  return z.object({
    email: z.string().trim().email(),
    password: z.string().min(8, t.validation.setup.passwordLength),
  });
}
