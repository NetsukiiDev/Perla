// POST /api/admin/auth/setup — second (final) step of first-run setup:
// creates the FIRST admin account and signs them in, then marks setup
// complete. Requires the database to already be configured.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { adminSetupSchema } from "@/lib/validation/admin-setup";
import { hashPassword } from "@/lib/hash";
import { issueAdminSession } from "@/lib/auth-admin";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { isDatabaseConfigured, isSetupComplete, markSetupComplete } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isSetupComplete() && (await prisma.adminUser.count()) > 0) {
    return NextResponse.json({ error: "already_configured", message: "Configurazione già completata." }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "db_not_configured", message: "Configura prima il database." }, { status: 409 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "admin-setup"), { windowMs: 15 * 60_000, max: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", message: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = adminSetupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dati non validi.";
    return NextResponse.json({ error: "invalid", message: first }, { status: 400 });
  }

  if (await prisma.adminUser.count()) {
    markSetupComplete();
    return NextResponse.json({ error: "already_configured", message: "Un admin esiste già." }, { status: 403 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user;
  try {
    user = await prisma.adminUser.create({
      data: { email: parsed.data.email, passwordHash, role: "admin" },
    });
  } catch {
    return NextResponse.json({ error: "already_configured", message: "Email già registrata." }, { status: 409 });
  }

  markSetupComplete();
  await issueAdminSession({ id: user.id, role: user.role });
  await writeAccessLog({ type: AccessLogType.admin_login, metadata: { userId: user.id, setup: true } });

  return NextResponse.json({ ok: true });
}
