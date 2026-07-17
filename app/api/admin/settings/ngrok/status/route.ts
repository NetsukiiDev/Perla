// GET /api/admin/settings/ngrok/status — whether a tunnel is currently running, and its public URL.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getTunnelStatus } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  return NextResponse.json(getTunnelStatus());
}
