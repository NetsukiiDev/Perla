// POST /api/admin/settings/cloudflare/[userId]/start — admin-only: start
// another user's Cloudflare Tunnel on their behalf, using their own saved
// config (or an anonymous Quick Tunnel if they haven't saved one).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";
import { isVercel } from "@/lib/env";
import { startTunnel } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  if (isVercel()) {
    return NextResponse.json({ error: "vercel_unsupported" }, { status: 400 });
  }

  const { userId } = await params;
  const cfg = await prisma.cloudflareTunnelConfig.findUnique({ where: { adminUserId: userId } });

  let tunnelToken: string | undefined;
  if (cfg?.tunnelTokenEncrypted) {
    try {
      tunnelToken = decrypt(cfg.tunnelTokenEncrypted);
    } catch {
      return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
    }
  }

  const result = await startTunnel(userId, {
    tunnelToken,
    hostname: cfg?.hostname,
    port: Number(process.env.PORT) || 3000,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url });
}
