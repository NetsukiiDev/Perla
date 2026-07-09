import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { turnstileConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const cfg = await prisma.turnstileConfig.findUnique({ where: { id: "default" } });
  if (!cfg) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    siteKey: cfg.siteKey,
    hasSecretKey: Boolean(cfg.secretKeyEncrypted),
    enabled: cfg.enabled,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = turnstileConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const { secretKey, ...rest } = parsed.data;

  const existing = await prisma.turnstileConfig.findUnique({ where: { id: "default" } });
  const secretKeyEncrypted =
    secretKey && secretKey.length > 0 ? encrypt(secretKey) : existing?.secretKeyEncrypted ?? null;

  try {
    await prisma.turnstileConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...rest,
        secretKeyEncrypted,
      },
      update: {
        ...rest,
        secretKeyEncrypted,
      },
    });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({
    type: "admin_action",
    metadata: { action: "Configurazione Turnstile salvata" },
  });

  return NextResponse.json({ ok: true });
}
