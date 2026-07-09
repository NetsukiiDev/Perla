// POST /api/admin/setup/database — first-run DB configuration. Tests the
// connection, creates the schema, and persists the connection. Refuses once
// setup is complete. Node runtime (spawns the Prisma CLI).
import { NextResponse } from "next/server";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { setupDatabaseSchema } from "@/lib/validation/admin-setup";
import { isSetupComplete, runtimeProvider, saveDatabaseConfig } from "@/lib/config";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { DbInitError, pushSchema, testConnection } from "@/lib/db-init";
import { buildConnectionUrl } from "@/lib/db-url";
import { resetPrismaClient } from "@/lib/db";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isSetupComplete()) {
    return NextResponse.json({ error: "already_configured" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "setup-database"), { windowMs: 10 * 60_000, max: 20 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = setupDatabaseSchema(t).safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dati non validi.";
    return NextResponse.json({ error: "invalid", message: first }, { status: 400 });
  }
  const { provider } = parsed.data;

  // Either a full string or individual fields; assemble + encode from fields.
  const rawUrl = parsed.data.url;
  let url: string;
  if (rawUrl) {
    url = rawUrl
      // Strip JDBC prefix (jdbc:mysql:// → mysql://, jdbc:postgresql:// → postgresql://, etc.)
      .replace(/^jdbc:/i, "")
      // Normalize mariadb:// → mysql:// for Prisma compatibility
      .replace(/^mariadb:\/\//i, "mysql://");
  } else {
    url = buildConnectionUrl(provider, {
      host: parsed.data.host!,
      port: parsed.data.port,
      user: parsed.data.user!,
      password: parsed.data.password,
      database: parsed.data.database!,
    });
  }

  try {
    await testConnection(provider, url);
    await pushSchema(provider, url);
  } catch (err) {
    const message = err instanceof DbInitError ? err.message : "Inizializzazione del database fallita.";
    return NextResponse.json({ error: "db_init_failed", message }, { status: 400 });
  }

  saveDatabaseConfig({ provider, url });

  // Sync the provider to .env so future restarts pick it up automatically.
  try {
    syncEnvProvider(provider);
  } catch {
    // Non-critical — the config file still has the right values.
  }

  // A provider different from the one the running process/client was
  // generated for needs a regenerate + restart before queries will work.
  const normalized = provider === "mariadb" ? "mysql" : provider;
  const current = runtimeProvider() === "mariadb" ? "mysql" : runtimeProvider();
  const restartRequired = normalized !== current;

  if (!restartRequired) {
    await resetPrismaClient();
  }

  return NextResponse.json({ ok: true, restartRequired, provider });
}

function syncEnvProvider(provider: string): void {
  const envPath = join(process.cwd(), ".env");
  let content = "";
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    content = "";
  }

  const lines = content.split("\n");
  const out: string[] = [];
  let foundProvider = false;

  for (const line of lines) {
    if (/^DATABASE_PROVIDER=/i.test(line)) {
      out.push(`DATABASE_PROVIDER="${provider}"`);
      foundProvider = true;
    } else {
      // DATABASE_URL and everything else pass through unchanged — the URL
      // itself lives in .data/config.json, not .env.
      out.push(line);
    }
  }

  if (!foundProvider) {
    out.push(`\nDATABASE_PROVIDER="${provider}"`);
  }

  writeFileSync(envPath, out.join("\n"), "utf8");
}
