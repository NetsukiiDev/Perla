// GET /api/admin/account/cloudflare — current user's Cloudflare Tunnel config (token never returned)
// PUT /api/admin/account/cloudflare — create/update the current user's config
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { cloudflareTunnelConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const cfg = await prisma.cloudflareTunnelConfig.findUnique({ where: { adminUserId: auth.session.userId } });
  if (!cfg) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    hasTunnelToken: Boolean(cfg.tunnelTokenEncrypted),
    hostname: cfg.hostname,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = cloudflareTunnelConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const { tunnelToken, hostname } = parsed.data;

  try {
    const existing = await prisma.cloudflareTunnelConfig.findUnique({ where: { adminUserId: auth.session.userId } });
    const tunnelTokenEncrypted =
      tunnelToken && tunnelToken.length > 0 ? encrypt(tunnelToken) : existing?.tunnelTokenEncrypted ?? null;

    await prisma.cloudflareTunnelConfig.upsert({
      where: { adminUserId: auth.session.userId },
      create: { adminUserId: auth.session.userId, tunnelTokenEncrypted, hostname: hostname || null },
      update: { tunnelTokenEncrypted, hostname: hostname || null },
    });
  } catch (err) {
    console.error("Failed to save Cloudflare Tunnel config", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Configurazione Cloudflare Tunnel salvata" } });
  return NextResponse.json({ ok: true });
}
