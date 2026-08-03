// POST /api/admin/account/cloudflare/stop — kill the current user's running Cloudflare Tunnel, if any.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { stopTunnel } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  await stopTunnel(auth.session.userId);
  return NextResponse.json({ ok: true });
}
