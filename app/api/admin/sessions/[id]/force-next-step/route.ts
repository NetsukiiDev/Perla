// POST /api/admin/sessions/[id]/force-next-step — admin override that
// advances the participant by one step without requiring proximity. If
// already on the last step, this completes the journey instead.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { writeAccessLog } from "@/lib/access-log";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { inviteCode: { include: { event: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  const event = session.inviteCode.event;

  if (session.currentStep >= event.stepsCount) {
    await prisma.$transaction([
      prisma.session.update({ where: { id }, data: { status: "completed", completedAt: now, lastSeenAt: now } }),
      prisma.inviteCode.update({
        where: { id: session.inviteCodeId },
        data: { status: "arrived", completedAt: now },
      }),
      prisma.participant.update({ where: { id: session.participantId }, data: { status: "arrived" } }),
      prisma.locationUpdate.deleteMany({ where: { sessionId: id } }),
    ]);

    await writeAccessLog({
      type: AccessLogType.admin_action,
      eventId: event.id,
      participantId: session.participantId,
      inviteCodeId: session.inviteCodeId,
      sessionId: id,
      metadata: { action: "force_next_step", result: "arrived" },
    });

    return NextResponse.json({ ok: true, arrived: true });
  }

  const nextStep = session.currentStep + 1;

  await prisma.$transaction([
    prisma.session.update({ where: { id }, data: { currentStep: nextStep, lastSeenAt: now } }),
    prisma.routeStep.update({
      where: { sessionId_stepNumber: { sessionId: id, stepNumber: nextStep } },
      data: { unlockedAt: now },
    }),
    prisma.inviteCode.update({ where: { id: session.inviteCodeId }, data: { status: "in_progress" } }),
    prisma.participant.update({ where: { id: session.participantId }, data: { status: "in_progress" } }),
  ]);

  await writeAccessLog({
    type: AccessLogType.admin_action,
    eventId: event.id,
    participantId: session.participantId,
    inviteCodeId: session.inviteCodeId,
    sessionId: id,
    metadata: { action: "force_next_step", currentStep: nextStep },
  });

  return NextResponse.json({ ok: true, currentStep: nextStep });
}
