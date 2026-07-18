// GET  /api/admin/settings/smtp — current SMTP config (password never returned)
// PUT  /api/admin/settings/smtp — create/update the singleton SMTP config
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { smtpConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const cfg = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
  if (!cfg) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    hasPassword: Boolean(cfg.passwordEncrypted),
    fromName: cfg.fromName,
    fromEmail: cfg.fromEmail,
    enabled: cfg.enabled,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = smtpConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;

  const existing = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
  const passwordEncrypted =
    password && password.length > 0 ? encrypt(password) : existing?.passwordEncrypted ?? null;

  try {
    await prisma.smtpConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...rest,
        passwordEncrypted,
      },
      update: {
        ...rest,
        passwordEncrypted,
      },
    });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({
    type: "admin_action",
    metadata: { action: "Configurazione SMTP salvata", detail: rest.host },
  });

  return NextResponse.json({ ok: true });
}
