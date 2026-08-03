// POST /api/admin/settings/cloudflare/[userId]/stop — admin-only: stop another user's running Cloudflare Tunnel.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { stopTunnel } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  await stopTunnel(userId);
  return NextResponse.json({ ok: true });
}
