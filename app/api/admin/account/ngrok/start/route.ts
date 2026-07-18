// POST /api/admin/account/ngrok/start — spawn an ngrok tunnel to this server
// using the current user's saved config. Refuses on Vercel specifically:
// serverless functions have no persistent process to keep a tunnel listener
// alive. Self-hosted deployments (a VPS running this under systemd/pm2, same
// as `next dev`) are a normal long-running Node process and can support it —
// e.g. running it alongside an existing Cloudflare Tunnel is a deliberate
// choice some deployments make, not something this route should block.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";
import { isVercel } from "@/lib/env";
import { startTunnel } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  if (isVercel()) {
    return NextResponse.json({ error: "vercel_unsupported" }, { status: 400 });
  }

  const cfg = await prisma.ngrokConfig.findUnique({ where: { adminUserId: auth.session.userId } });
  if (!cfg?.authtokenEncrypted) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  let authtoken: string;
  try {
    authtoken = decrypt(cfg.authtokenEncrypted);
  } catch {
    // Stored value was encrypted with a since-rotated ENCRYPTION_KEY (e.g.
    // after a key regeneration) — it can never be read back, not a transient
    // failure. Surface this distinctly so the UI can point at re-entering it,
    // instead of a generic "start failed" that looks retriable.
    return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
  }
  const result = await startTunnel(auth.session.userId, { authtoken, domain: cfg.domain, port: Number(process.env.PORT) || 3000 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url });
}
