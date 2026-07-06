// Validated process.env accessor for Node-runtime code (API routes, server
// components, cron). Not imported from proxy.ts — that runs on the
// Edge runtime and only needs ADMIN_SESSION_SECRET, read directly there.
import { z } from "zod";

const envSchema = z.object({
  // Optional: the DB connection can instead be configured through the
  // first-run setup wizard (persisted to .data/config.json). See lib/config.ts.
  DATABASE_URL: z.string().optional(),
  DATABASE_PROVIDER: z.enum(["postgresql", "postgres", "mysql", "mariadb", "mongodb"]).default("postgresql"),
  ENCRYPTION_KEY: z.string().min(1),
  HASH_PEPPER: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(1),
  PARTICIPANT_SESSION_SECRET: z.string().min(1),
  ROUTE_PROVIDER: z.enum(["osrm", "openrouteservice", "google-routes"]).default("osrm"),
  OSRM_BASE_URL: z.string().min(1).default("https://router.project-osrm.org"),
  OSRM_PROFILE: z.string().min(1).default("driving"),
  OPENROUTESERVICE_BASE_URL: z.string().min(1).default("https://api.openrouteservice.org"),
  OPENROUTESERVICE_PROFILE: z.string().min(1).default("driving-car"),
  OPENROUTESERVICE_API_KEY: z.string().optional(),
  GOOGLE_ROUTES_BASE_URL: z.string().min(1).default("https://routes.googleapis.com/directions/v2:computeRoutes"),
  GOOGLE_ROUTES_TRAVEL_MODE: z.string().min(1).default("DRIVE"),
  GOOGLE_ROUTES_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(1),
  LOCATION_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
