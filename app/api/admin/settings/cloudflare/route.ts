// GET /api/admin/settings/cloudflare — admin-only overview of every admin/organizer's
// Cloudflare Tunnel (config presence + live running status). Mirrors
// /api/admin/settings/ngrok; distinct from /api/admin/account/cloudflare,
// the self-service endpoint each user uses for their own config.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { getTunnelStatus } from "@/lib/cloudflare-tunnel";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, cloudflareTunnelConfig: { select: { tunnelTokenEncrypted: true, hostname: true } } },
    orderBy: { email: "asc" },
  });

  const tunnels = users.map((u) => {
    const status = getTunnelStatus(u.id);
    return {
      userId: u.id,
      email: u.email,
      role: u.role,
      hasTunnelToken: Boolean(u.cloudflareTunnelConfig?.tunnelTokenEncrypted),
      hostname: u.cloudflareTunnelConfig?.hostname ?? null,
      running: status.running,
      url: status.url,
    };
  });

  return NextResponse.json({ tunnels });
}
