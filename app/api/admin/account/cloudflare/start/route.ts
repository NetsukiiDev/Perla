// POST /api/admin/account/cloudflare/start — spawn a Cloudflare Tunnel
// (cloudflared) to this server using the current user's saved config, or an
// anonymous Quick Tunnel if none is saved. Refuses on Vercel for the same
// reason as ngrok: serverless functions have no persistent process to keep a
// tunnel alive.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";
import { isVercel } from "@/lib/env";
import { startTunnel } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  if (isVercel()) {
    return NextResponse.json({ error: "vercel_unsupported" }, { status: 400 });
  }

  const cfg = await prisma.cloudflareTunnelConfig.findUnique({ where: { adminUserId: auth.session.userId } });

  let tunnelToken: string | undefined;
  if (cfg?.tunnelTokenEncrypted) {
    try {
      tunnelToken = decrypt(cfg.tunnelTokenEncrypted);
    } catch {
      // Same distinct case as ngrok's start route: encrypted with a
      // since-rotated ENCRYPTION_KEY, not a transient failure.
      return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
    }
  }

  const result = await startTunnel(auth.session.userId, {
    tunnelToken,
    hostname: cfg?.hostname,
    port: Number(process.env.PORT) || 3000,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url });
}
