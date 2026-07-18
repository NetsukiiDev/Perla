import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";
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
  if (!session || !assertOwnsEvent(auth.session, session.inviteCode.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  const event = session.inviteCode.event;

  await prisma.$transaction([
    prisma.session.update({
      where: { id },
      data: { status: "completed", currentStep: event.stepsCount, completedAt: now, lastSeenAt: now },
    }),
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
    metadata: { action: "mark_arrived" },
  });

  return NextResponse.json({ ok: true });
}
