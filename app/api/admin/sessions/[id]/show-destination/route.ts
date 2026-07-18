// POST /api/admin/sessions/[id]/show-destination — admin override that
// reveals the event destination as the participant's current step without
// completing the session.
import { NextResponse } from "next/server";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";
import { writeAccessLog } from "@/lib/access-log";
import { prisma } from "@/lib/db";
import { AccessLogType } from "@/lib/generated/prisma/client";

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
  if (session.status !== "active") {
    return NextResponse.json({ error: "not_active" }, { status: 409 });
  }

  const now = new Date();
  const event = session.inviteCode.event;
  const destinationStep = event.stepsCount;

  await prisma.$transaction([
    prisma.session.update({
      where: { id },
      data: { currentStep: destinationStep, completedAt: null, lastSeenAt: now },
    }),
    prisma.routeStep.upsert({
      where: { sessionId_stepNumber: { sessionId: id, stepNumber: destinationStep } },
      create: {
        sessionId: id,
        stepNumber: destinationStep,
        latEncrypted: event.destinationLatEncrypted,
        lngEncrypted: event.destinationLngEncrypted,
        radiusM: event.unlockRadiusM,
        unlockedAt: now,
      },
      update: {
        latEncrypted: event.destinationLatEncrypted,
        lngEncrypted: event.destinationLngEncrypted,
        radiusM: event.unlockRadiusM,
        unlockedAt: now,
      },
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
    metadata: { action: "show_destination", currentStep: destinationStep },
  });

  return NextResponse.json({ ok: true, currentStep: destinationStep });
}
