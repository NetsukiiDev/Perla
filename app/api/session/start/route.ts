// POST /api/session/start — called once the participant grants geolocation
// consent. Computes a route to the event's (encrypted) destination via the
// configured provider, splits it into N steps, persists them encrypted,
// and binds a brand-new session to this device/token/IP/UA.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { sessionStartSchema } from "@/lib/validation/code";
import { decryptCoord, encrypt, encryptCoord } from "@/lib/crypto";
import { generateRandomToken, sha256Hex } from "@/lib/hash";
import { resolveParticipantNetworkInfo } from "@/lib/ip-info";
import { getRouteProvider, RouteProviderError } from "@/lib/route-provider";
import { buildRouteSteps } from "@/lib/route-steps";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";
import type { InviteCodeStatus, Session } from "@/lib/generated/prisma/client";
import { getOrCreateDeviceToken, issueParticipantSession, readCodeRef } from "@/lib/session-participant";
import { projectActiveSession } from "@/lib/public-projection";
import { evaluateInviteCodeState } from "@/lib/code-resolution";
import { ERROR_MESSAGES, DEFAULTS } from "@/lib/constants";

const CLAIMABLE_CODE_STATUSES: InviteCodeStatus[] = ["created", "valid", "scheduled"];

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "session-start"), { windowMs: 5 * 60_000, max: 10 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const codeRef = await readCodeRef();
  if (!codeRef) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { id: codeRef.inviteCodeId },
    include: { event: true },
  });
  if (!inviteCode || inviteCode.codeHash !== codeRef.codeHash) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Re-validate: another tab/device may have raced us, or the event may
  // have changed state since the code_ref cookie was issued.
  const precheck = await evaluateInviteCodeState(inviteCode, inviteCode.event, codeRef.codeDisplay);
  if (precheck.kind === "not_available" || precheck.kind === "invalid") {
    return NextResponse.json({ error: "not_available", message: ERROR_MESSAGES.CODE_NOT_AVAILABLE }, { status: 409 });
  }
  if (precheck.kind === "already_used") {
    return NextResponse.json({ error: "already_used", message: ERROR_MESSAGES.ALREADY_USED }, { status: 409 });
  }
  if (precheck.kind === "in_progress" || precheck.kind === "arrived") {
    // evaluateInviteCodeState already resumed an existing session (same
    // device) and issued its cookie — nothing left to create.
    return NextResponse.json({ state: precheck });
  }
  if (precheck.kind === "not_yet_available") {
    return NextResponse.json({ error: "not_yet_available", message: precheck.message }, { status: 409 });
  }

  const event = inviteCode.event;
  const { lat, lng, accuracy } = parsed.data;

  const destination = {
    lat: decryptCoord(event.destinationLatEncrypted),
    lng: decryptCoord(event.destinationLngEncrypted),
  };

  let routeResult;
  try {
    routeResult = await getRouteProvider().getRoute({ lat, lng }, destination);
  } catch (err) {
    await writeAccessLog({
      type: AccessLogType.routing_error,
      eventId: event.id,
      participantId: inviteCode.participantId,
      inviteCodeId: inviteCode.id,
      metadata: { message: err instanceof RouteProviderError ? err.message : "unknown" },
    });
    return NextResponse.json({ error: "routing_failed", message: ERROR_MESSAGES.GENERIC }, { status: 502 });
  }

  const stepPoints = buildRouteSteps(routeResult.polyline, event.stepsCount, destination, event.unlockRadiusM);

  const sessionTokenRaw = generateRandomToken();
  const device = await getOrCreateDeviceToken();
  const networkInfo = await resolveParticipantNetworkInfo(ip);
  const now = new Date();
  const locationExpiresAt = new Date(
    now.getTime() + Number(process.env.LOCATION_RETENTION_HOURS ?? DEFAULTS.LOCATION_RETENTION_HOURS) * 60 * 60 * 1000,
  );

  const baseSessionData = {
    inviteCodeId: inviteCode.id,
    sessionTokenHash: sha256Hex(sessionTokenRaw),
    deviceTokenHash: device.hash,
    ipHash: sha256Hex(ip),
    ipAddressEncrypted: networkInfo.ipAddress ? encrypt(networkInfo.ipAddress) : null,
    ipIsp: networkInfo.isp,
    userAgentHash: sha256Hex(getUserAgent(req)),
    status: "active" as const,
    currentStep: 1,
    totalDistanceM: routeResult.distanceM,
    totalDurationS: Math.round(routeResult.durationS),
    hasHighway: routeResult.toll?.hasHighway ?? null,
    tollEstimateCents: routeResult.toll?.tollCents ?? null,
    startedAt: now,
    lastSeenAt: now,
  };
  const routeStepRows = (sessionId: string) =>
    stepPoints.map((p) => ({
      sessionId,
      stepNumber: p.stepNumber,
      latEncrypted: encryptCoord(p.lat),
      lngEncrypted: encryptCoord(p.lng),
      radiusM: p.radiusM,
      unlockedAt: p.stepNumber === 1 ? now : null,
    }));
  const locationRow = (sessionId: string) => ({
    sessionId,
    latEncrypted: encryptCoord(lat),
    lngEncrypted: encryptCoord(lng),
    accuracyM: accuracy ?? null,
    expiresAt: locationExpiresAt,
  });

  let session: Session;
  if (inviteCode.isPublic) {
    // Public code: reusable, never consumed. Enforce the usage cap, then spawn
    // a fresh guest participant + session bound to this device.
    const used = await prisma.session.count({ where: { inviteCodeId: inviteCode.id } });
    if (used >= inviteCode.maxSessions) {
      return NextResponse.json({ error: "not_available", message: ERROR_MESSAGES.CODE_NOT_AVAILABLE }, { status: 409 });
    }
    session = await prisma.$transaction(async (tx) => {
      const guest = await tx.participant.create({
        data: { eventId: event.id, displayName: "Ospite", status: "started" },
      });
      const created = await tx.session.create({ data: { ...baseSessionData, participantId: guest.id } });
      await tx.routeStep.createMany({ data: routeStepRows(created.id) });
      await tx.locationUpdate.create({ data: locationRow(created.id) });
      return created;
    });
  } else {
    // Personal code: single-use. Claim atomically so only one session wins.
    const participantId = inviteCode.participantId;
    if (!participantId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const claimed = await prisma.$transaction(async (tx) => {
      const claim = await tx.inviteCode.updateMany({
        where: {
          id: inviteCode.id,
          status: { in: CLAIMABLE_CODE_STATUSES },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: { status: "started", activatedAt: now },
      });
      if (claim.count !== 1) return null;
      const created = await tx.session.create({ data: { ...baseSessionData, participantId } });
      await tx.routeStep.createMany({ data: routeStepRows(created.id) });
      await tx.locationUpdate.create({ data: locationRow(created.id) });
      await tx.participant.update({ where: { id: participantId }, data: { status: "started" } });
      return created;
    });
    if (!claimed) {
      return NextResponse.json({ error: "already_used", message: ERROR_MESSAGES.ALREADY_USED }, { status: 409 });
    }
    session = claimed;
  }

  await issueParticipantSession({ sessionId: session.id, sessionTokenRaw, participantCode: codeRef.codeDisplay });

  await writeAccessLog({
    type: AccessLogType.session_started,
    eventId: event.id,
    participantId: session.participantId,
    inviteCodeId: inviteCode.id,
    sessionId: session.id,
  });

  const currentStep = await prisma.routeStep.findUnique({
    where: { sessionId_stepNumber: { sessionId: session.id, stepNumber: 1 } },
  });

  const state = projectActiveSession({ event, session, currentStep, participantCode: codeRef.codeDisplay });
  return NextResponse.json({ state });
}
