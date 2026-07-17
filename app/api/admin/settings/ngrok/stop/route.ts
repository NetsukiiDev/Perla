// POST /api/admin/settings/ngrok/stop — kill the running ngrok tunnel, if any.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { stopTunnel } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  await stopTunnel();
  return NextResponse.json({ ok: true });
}
