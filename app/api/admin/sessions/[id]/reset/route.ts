// POST /api/admin/sessions/[id]/reset — restarts the journey from step 1
// on the same session/device binding (e.g. participant got lost).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { inviteCode: { include: { event: true } } },
  });
  if (!session || !assertOwnsEvent(auth.session, session.inviteCode.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.session.update({
      where: { id },
      data: { status: "active", currentStep: 1, completedAt: null, lastSeenAt: now },
    }),
    prisma.routeStep.updateMany({ where: { sessionId: id }, data: { reachedAt: null, unlockedAt: null } }),
    prisma.routeStep.update({
      where: { sessionId_stepNumber: { sessionId: id, stepNumber: 1 } },
      data: { unlockedAt: now },
    }),
    prisma.locationUpdate.deleteMany({ where: { sessionId: id } }),
    prisma.inviteCode.update({ where: { id: session.inviteCodeId }, data: { status: "started" } }),
    prisma.participant.update({ where: { id: session.participantId }, data: { status: "started" } }),
  ]);

  return NextResponse.json({ ok: true });
}
