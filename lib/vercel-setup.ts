// Server-only helper describing how far first-run setup has progressed on
// Vercel. On Vercel there is no DB-config wizard — the connection and app
// secrets all come from project environment variables — so the app instead
// routes visitors to /admin/setup (the guide) until everything is in place
// and a first admin exists.
//
// Keep REQUIRED_SECRETS in sync with the non-optional fields in lib/env.ts.
import { prisma } from "./db";
import { getDbConfig } from "./config";

// App secrets the server cannot boot without (all `.min(1)` in lib/env.ts).
export const REQUIRED_SECRETS = [
  "ENCRYPTION_KEY",
  "HASH_PEPPER",
  "ADMIN_SESSION_SECRET",
  "PARTICIPANT_SESSION_SECRET",
  "CRON_SECRET",
] as const;

export type VercelSetupState = "needs-env" | "db-unreachable" | "needs-admin" | "ready";

// Names of required env vars that are still unset. DATABASE_URL is included
// because the DB connection is mandatory on Vercel (no wizard fallback).
export function missingEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  for (const key of REQUIRED_SECRETS) {
    if (!process.env[key]) missing.push(key);
  }
  return missing;
}

// Resolves the current setup stage. Only meaningful when running on Vercel;
// callers gate on isVercel() first.
export async function getVercelSetupState(): Promise<VercelSetupState> {
  if (missingEnvVars().length > 0 || !getDbConfig()) return "needs-env";
  try {
    const count = await prisma.adminUser.count();
    return count > 0 ? "ready" : "needs-admin";
  } catch {
    return "db-unreachable";
  }
}
