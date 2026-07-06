import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { codeStatusUpdateSchema } from "@/lib/validation/admin-codes";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = codeStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.inviteCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!parsed.data.active) {
    const inviteCode = await prisma.$transaction(async (tx) => {
      const updated = await tx.inviteCode.update({
        where: { id },
        data: { status: "revoked", revokedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { inviteCodeId: id, status: "active" },
        data: { status: "expired" },
      });
      return updated;
    });

    return NextResponse.json({ inviteCode });
  }

  const inviteCode = await prisma.$transaction(async (tx) => {
    const updated = await tx.inviteCode.update({
      where: { id },
      data: { status: "valid", revokedAt: null, completedAt: null },
    });
    await tx.participant.update({
      where: { id: existing.participantId },
      data: { status: "not_started" },
    });
    return updated;
  });

  return NextResponse.json({ inviteCode });
}
