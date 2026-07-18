// POST /api/admin/settings/ngrok/start — spawn an ngrok tunnel to this
// server using the saved config. Refuses on Vercel specifically: serverless
// functions have no persistent process to keep a tunnel listener alive.
// Self-hosted deployments (a VPS running this under systemd/pm2, same as
// `next dev`) are a normal long-running Node process and can support it —
// e.g. running it alongside an existing Cloudflare Tunnel is a deliberate
// choice some deployments make, not something this route should block.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";
import { isVercel } from "@/lib/env";
import { startTunnel } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  if (isVercel()) {
    return NextResponse.json({ error: "vercel_unsupported" }, { status: 400 });
  }

  const cfg = await prisma.ngrokConfig.findUnique({ where: { id: "default" } });
  if (!cfg?.authtokenEncrypted) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const authtoken = decrypt(cfg.authtokenEncrypted);
  const result = await startTunnel({ authtoken, domain: cfg.domain, port: Number(process.env.PORT) || 3000 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url });
}
