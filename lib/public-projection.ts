// The single allow-list boundary between DB rows and anything sent to a
// participant. Every participant-facing route/page must build its response
// through these functions — never serialize raw Prisma rows. In particular,
// `projectActiveSession` is the only code path that ever decrypts a
// RouteStep's coordinates, and it only ever receives the session's CURRENT
// step, never the full list.
import { decryptCoord } from "@/lib/crypto";
import { formatHHmm, notYetAvailableMessage, STEP_HINT } from "@/lib/constants";
import type { Event, RouteStep, Session } from "@/lib/generated/prisma/client";

export type PublicState =
  | { kind: "invalid" }
  | { kind: "not_available" }
  | { kind: "already_used" }
  | {
      kind: "not_yet_available";
      region: string;
      startsAt: string;
      endsAt: string | null;
      participantCode?: string;
      message: string;
    }
  | { kind: "needs_consent"; region: string; startsAt: string; endsAt: string | null; participantCode?: string }
  | { kind: "geolocation_denied" }
  | {
      kind: "in_progress";
      region: string;
      startsAt: string;
      endsAt: string | null;
      stepIndex: number;
      stepsCount: number;
      lat: number;
      lng: number;
      totalDistanceM?: number;
      totalDurationS?: number;
      stepDistanceM?: number;
      stepDurationS?: number;
      hasHighway?: boolean;
      tollEstimateCents?: number;
      participantCode?: string;
      hint: string;
    }
  | { kind: "arrived" };

function eventIsUnavailable(event: Event, now = Date.now()): boolean {
  return (
    event.status === "closed" ||
    event.status === "archived" ||
    event.status === "draft" ||
    (event.endsAt !== null && event.endsAt.getTime() <= now)
  );
}

// Used before any session exists, right after a code resolves to a valid,
// non-revoked, non-expired event/code pair.
export function projectPreSessionState(event: Event, participantCode?: string): PublicState {
  const now = Date.now();
  if (eventIsUnavailable(event, now)) {
    return { kind: "not_available" };
  }

  const revealAt = event.revealAt;
  const notYetActive = event.status !== "active" || (revealAt !== null && revealAt.getTime() > now);

  if (notYetActive) {
    return {
      kind: "not_yet_available",
      region: event.region,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      participantCode,
      message: revealAt
        ? notYetAvailableMessage(revealAt)
        : `Le posizioni non sono ancora disponibili. Riprova alle ${formatHHmm(event.startsAt)}.`,
    };
  }

  return {
    kind: "needs_consent",
    region: event.region,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    participantCode,
  };
}

// Used once a session exists. `currentStep` must be the session's current
// RouteStep row only (never the full set).
export function projectActiveSession(params: {
  event: Event;
  session: Session;
  currentStep: RouteStep | null;
  participantCode?: string | null;
}): PublicState {
  const { event, session, currentStep, participantCode } = params;
  const now = Date.now();

  if (
    eventIsUnavailable(event, now) ||
    event.status !== "active" ||
    (event.revealAt !== null && event.revealAt.getTime() > now)
  ) {
    return { kind: "not_available" };
  }

  if (session.status === "completed") {
    return { kind: "arrived" };
  }

  if (session.status === "blocked" || session.status === "expired") {
    return { kind: "not_available" };
  }

  if (!currentStep) {
    return { kind: "not_available" };
  }

  return {
    kind: "in_progress",
    region: event.region,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    stepIndex: session.currentStep,
    stepsCount: event.stepsCount,
    lat: decryptCoord(currentStep.latEncrypted),
    lng: decryptCoord(currentStep.lngEncrypted),
    totalDistanceM: event.showTotalDistance ? (session.totalDistanceM ?? undefined) : undefined,
    totalDurationS: event.showTotalDuration ? (session.totalDurationS ?? undefined) : undefined,
    stepDistanceM:
      event.showTotalDistance && session.totalDistanceM !== null
        ? session.totalDistanceM / event.stepsCount
        : undefined,
    stepDurationS:
      event.showTotalDuration && session.totalDurationS !== null
        ? session.totalDurationS / event.stepsCount
        : undefined,
    hasHighway: event.showTollInfo ? (session.hasHighway ?? undefined) : undefined,
    tollEstimateCents:
      event.showTollInfo && session.hasHighway ? (session.tollEstimateCents ?? undefined) : undefined,
    participantCode: participantCode ?? undefined,
    hint: STEP_HINT,
  };
}
