import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const inviteCode = await prisma.inviteCode
    .update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } })
    .catch(() => null);

  if (!inviteCode) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Revoking a code ends any in-progress access immediately.
  await prisma.session.updateMany({
    where: { inviteCodeId: id, status: "active" },
    data: { status: "expired" },
  });

  return NextResponse.json({ inviteCode });
}
