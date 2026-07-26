// GET /api/admin/account/api-key — current user's API key status (never the key itself)
// POST /api/admin/account/api-key — generate/regenerate; returns the plaintext key once
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { generateApiKey } from "@/lib/api-key";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const cfg = await prisma.apiKey.findUnique({ where: { adminUserId: auth.session.userId } });
  if (!cfg) return NextResponse.json({ configured: false, createdAt: null, lastUsedAt: null });
  return NextResponse.json({ configured: true, createdAt: cfg.createdAt, lastUsedAt: cfg.lastUsedAt });
}

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { key, keyHash } = generateApiKey();
  await prisma.apiKey.upsert({
    where: { adminUserId: auth.session.userId },
    create: { adminUserId: auth.session.userId, keyHash },
    update: { keyHash, lastUsedAt: null },
  });

  await writeAccessLog({ type: "admin_action", metadata: { action: "API key generata/rigenerata" } });
  return NextResponse.json({ key });
}
