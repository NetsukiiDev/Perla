import { z } from "zod";

// Accepts either a full connection string OR individual fields (manual
// entry). The server assembles + URL-encodes the URL from the fields when
// no string is provided.
export const setupDatabaseSchema = z
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
    message: "Fornisci una stringa di connessione oppure host, utente e database.",
  });

export const adminSetupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
});
