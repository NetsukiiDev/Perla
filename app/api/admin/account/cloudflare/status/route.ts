// GET /api/admin/account/cloudflare/status — whether the current user's Cloudflare Tunnel is running, and its public URL.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getTunnelStatus } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  return NextResponse.json(getTunnelStatus(auth.session.userId));
}
