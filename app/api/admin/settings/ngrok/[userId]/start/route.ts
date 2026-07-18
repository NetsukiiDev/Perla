// POST /api/admin/settings/ngrok/[userId]/start — admin-only: start another
// user's ngrok tunnel on their behalf, using their own saved authtoken.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";
import { isVercel } from "@/lib/env";
import { startTunnel } from "@/lib/ngrok-tunnel";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  if (isVercel()) {
    return NextResponse.json({ error: "vercel_unsupported" }, { status: 400 });
  }

  const { userId } = await params;
  const cfg = await prisma.ngrokConfig.findUnique({ where: { adminUserId: userId } });
  if (!cfg?.authtokenEncrypted) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  let authtoken: string;
  try {
    authtoken = decrypt(cfg.authtokenEncrypted);
  } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
  }
  const result = await startTunnel(userId, { authtoken, domain: cfg.domain, port: Number(process.env.PORT) || 3000 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url });
}
