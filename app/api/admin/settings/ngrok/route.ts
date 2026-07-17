// GET /api/admin/settings/ngrok — current ngrok config (authtoken never returned)
// PUT /api/admin/settings/ngrok — create/update the singleton ngrok config
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { ngrokConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const cfg = await prisma.ngrokConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    hasAuthtoken: Boolean(cfg.authtokenEncrypted),
    domain: cfg.domain,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = ngrokConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const { authtoken, domain } = parsed.data;
  const existing = await prisma.ngrokConfig.findUnique({ where: { id: "default" } });
  const authtokenEncrypted = authtoken && authtoken.length > 0 ? encrypt(authtoken) : existing?.authtokenEncrypted ?? null;

  try {
    await prisma.ngrokConfig.upsert({
      where: { id: "default" },
      create: { id: "default", authtokenEncrypted, domain: domain || null },
      update: { authtokenEncrypted, domain: domain || null },
    });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Configurazione ngrok salvata" } });
  return NextResponse.json({ ok: true });
}
