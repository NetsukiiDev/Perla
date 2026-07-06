// POST /api/session/location — reports the participant's current position
// and checks server-side whether the current step's unlock radius has been
// reached. Never trusts the client about arrival; always re-checks here.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sessionLocationSchema } from "@/lib/validation/code";
import { decryptCoord, encryptCoord } from "@/lib/crypto";
import { isWithinRadius } from "@/lib/geo";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { deviceTokenMatchesSession, getParticipantSessionContext } from "@/lib/session-participant";
import { projectActiveSession } from "@/lib/public-projection";
import { DEFAULTS } from "@/lib/constants";

export async function POST(req: Request) {
  const ctx = await getParticipantSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const limit = rateLimit(rateLimitKey(ctx.id, "session-location"), { windowMs: 60_000, max: 12 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const deviceMatches = await deviceTokenMatchesSession(ctx);
  if (!deviceMatches) {
    return NextResponse.json({ error: "already_used" }, { status: 403 });
  }

  if (ctx.status !== "active") {
    const currentStep = await prisma.routeStep.findUnique({
      where: { sessionId_stepNumber: { sessionId: ctx.id, stepNumber: ctx.currentStep } },
    });
    return NextResponse.json({
      state: projectActiveSession({
        event: ctx.inviteCode.event,
        session: ctx,
        currentStep,
        participantCode: ctx.participantCode,
      }),
    });
  }

  const currentStep = await prisma.routeStep.findUnique({
    where: { sessionId_stepNumber: { sessionId: ctx.id, stepNumber: ctx.currentStep } },
  });
  const currentState = projectActiveSession({
    event: ctx.inviteCode.event,
    session: ctx,
    currentStep,
    participantCode: ctx.participantCode,
  });
  if (currentState.kind !== "in_progress") {
    return NextResponse.json({ state: currentState });
  }

  const body = await req.json().catch(() => null);
  const parsed = sessionLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { lat, lng, accuracy } = parsed.data;
  const now = new Date();

  const locationExpiresAt = new Date(
    now.getTime() + Number(process.env.LOCATION_RETENTION_HOURS ?? DEFAULTS.LOCATION_RETENTION_HOURS) * 60 * 60 * 1000,
  );

  await prisma.locationUpdate.create({
    data: {
      sessionId: ctx.id,
      latEncrypted: encryptCoord(lat),
      lngEncrypted: encryptCoord(lng),
      accuracyM: accuracy ?? null,
      expiresAt: locationExpiresAt,
    },
  });

  if (!currentStep) {
    await prisma.session.update({ where: { id: ctx.id }, data: { lastSeenAt: now } });
    return NextResponse.json({
      state: projectActiveSession({
        event: ctx.inviteCode.event,
        session: ctx,
        currentStep: null,
        participantCode: ctx.participantCode,
      }),
    });
  }

  const target = { lat: decryptCoord(currentStep.latEncrypted), lng: decryptCoord(currentStep.lngEncrypted) };
  const reached = isWithinRadius({ lat, lng }, target, currentStep.radiusM);

  if (!reached) {
    const updated = await prisma.session.update({
      where: { id: ctx.id },
      data: { lastSeenAt: now },
    });
    return NextResponse.json({
      state: projectActiveSession({
        event: ctx.inviteCode.event,
        session: updated,
        currentStep,
        participantCode: ctx.participantCode,
      }),
    });
  }

  await prisma.routeStep.update({ where: { id: currentStep.id }, data: { reachedAt: now } });

  const isFinalStep = ctx.currentStep >= ctx.inviteCode.event.stepsCount;

  if (isFinalStep) {
    const [updatedSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: ctx.id },
        data: { status: "completed", completedAt: now, lastSeenAt: now },
      }),
      prisma.inviteCode.update({
        where: { id: ctx.inviteCode.id },
        data: { status: "arrived", completedAt: now },
      }),
      prisma.participant.update({
        where: { id: ctx.participant.id },
        data: { status: "arrived" },
      }),
      prisma.locationUpdate.deleteMany({ where: { sessionId: ctx.id } }),
    ]);

    await writeAccessLog({
      type: AccessLogType.arrived,
      eventId: ctx.inviteCode.event.id,
      participantId: ctx.participant.id,
      inviteCodeId: ctx.inviteCode.id,
      sessionId: ctx.id,
    });

    return NextResponse.json({
      state: projectActiveSession({
        event: ctx.inviteCode.event,
        session: updatedSession,
        currentStep: null,
        participantCode: ctx.participantCode,
      }),
    });
  }

  const nextStepNumber = ctx.currentStep + 1;

  const [updatedSession] = await prisma.$transaction([
    prisma.session.update({
      where: { id: ctx.id },
      data: { currentStep: nextStepNumber, lastSeenAt: now },
    }),
    prisma.routeStep.update({
      where: { sessionId_stepNumber: { sessionId: ctx.id, stepNumber: nextStepNumber } },
      data: { unlockedAt: now },
    }),
    prisma.inviteCode.update({
      where: { id: ctx.inviteCode.id },
      data: { status: "in_progress" },
    }),
    prisma.participant.update({
      where: { id: ctx.participant.id },
      data: { status: "in_progress" },
    }),
  ]);

  await writeAccessLog({
    type: AccessLogType.step_unlocked,
    eventId: ctx.inviteCode.event.id,
    participantId: ctx.participant.id,
    inviteCodeId: ctx.inviteCode.id,
    sessionId: ctx.id,
    metadata: { stepNumber: nextStepNumber },
  });

  const newCurrentStep = await prisma.routeStep.findUnique({
    where: { sessionId_stepNumber: { sessionId: ctx.id, stepNumber: nextStepNumber } },
  });

  return NextResponse.json({
    state: projectActiveSession({
      event: ctx.inviteCode.event,
      session: updatedSession,
      currentStep: newCurrentStep,
      participantCode: ctx.participantCode,
    }),
  });
}
