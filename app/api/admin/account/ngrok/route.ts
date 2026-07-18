// GET /api/admin/account/ngrok — current user's ngrok config (authtoken never returned)
// PUT /api/admin/account/ngrok — create/update the current user's ngrok config
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ngrokConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const cfg = await prisma.ngrokConfig.findUnique({ where: { adminUserId: auth.session.userId } });
  if (!cfg) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    hasAuthtoken: Boolean(cfg.authtokenEncrypted),
    domain: cfg.domain,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = ngrokConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const { authtoken, domain } = parsed.data;

  try {
    const existing = await prisma.ngrokConfig.findUnique({ where: { adminUserId: auth.session.userId } });
    const authtokenEncrypted = authtoken && authtoken.length > 0 ? encrypt(authtoken) : existing?.authtokenEncrypted ?? null;

    await prisma.ngrokConfig.upsert({
      where: { adminUserId: auth.session.userId },
      create: { adminUserId: auth.session.userId, authtokenEncrypted, domain: domain || null },
      update: { authtokenEncrypted, domain: domain || null },
    });
  } catch (err) {
    console.error("Failed to save ngrok config", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Configurazione ngrok salvata" } });
  return NextResponse.json({ ok: true });
}
