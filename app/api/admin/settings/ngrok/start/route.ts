// POST /api/admin/settings/ngrok/start — spawn an ngrok tunnel to this dev
// server using the saved config. Refuses outside local development: tunneling
// an already-public production deployment makes no sense, and serverless
// platforms can't spawn long-lived child processes anyway.
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

  if (isVercel() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev_only" }, { status: 400 });
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
