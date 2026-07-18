import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.inviteCode.findUnique({ where: { id }, include: { event: true } });
  if (!existing || !assertOwnsEvent(auth.session, existing.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const inviteCode = await prisma.inviteCode.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });

  // Revoking a code ends any in-progress access immediately.
  await prisma.session.updateMany({
    where: { inviteCodeId: id, status: "active" },
    data: { status: "expired" },
  });

  return NextResponse.json({ inviteCode });
}
