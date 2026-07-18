// GET /api/admin/account/ngrok/status — whether the current user's tunnel is running, and its public URL.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getTunnelStatus } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  return NextResponse.json(getTunnelStatus(auth.session.userId));
}
