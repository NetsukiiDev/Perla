// GET /api/admin/settings/ngrok — admin-only overview of every admin/organizer's
// ngrok tunnel (config presence + live running status), so an admin can see
// and manage tunnels on behalf of other users. Distinct from
// /api/admin/account/ngrok, which is the self-service endpoint each user
// uses for their own config.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { getTunnelStatus } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, ngrokConfig: { select: { authtokenEncrypted: true, domain: true } } },
    orderBy: { email: "asc" },
  });

  const tunnels = users.map((u) => {
    const status = getTunnelStatus(u.id);
    return {
      userId: u.id,
      email: u.email,
      role: u.role,
      hasAuthtoken: Boolean(u.ngrokConfig?.authtokenEncrypted),
      domain: u.ngrokConfig?.domain ?? null,
      running: status.running,
      url: status.url,
    };
  });

  return NextResponse.json({ tunnels });
}
