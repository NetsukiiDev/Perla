// Shared resolution logic for "what should this participant see right
// now", used by GET /api/session/current AND the /c page's server
// component (which calls it directly instead of self-fetching the route).
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/hash";
import {
  deviceTokenMatchesSession,
  getParticipantSessionContext,
  issueParticipantSession,
  readCodeRef,
} from "@/lib/session-participant";
import { projectActiveSession, projectPreSessionState, type PublicState } from "@/lib/public-projection";
import type { Event, InviteCode, Session } from "@/lib/generated/prisma/client";

const BLOCKING_CODE_STATUSES = new Set(["revoked", "deleted", "blocked", "expired"]);
const USED_CODE_STATUSES = new Set(["started", "in_progress"]);

function eventIsUnavailable(event: Event): boolean {
  const now = Date.now();
  return (
    event.status === "closed" ||
    event.status === "archived" ||
    event.status === "draft" ||
    (event.endsAt !== null && event.endsAt.getTime() <= now)
  );
}

async function currentRouteStepFor(session: Session) {
  return prisma.routeStep.findUnique({
    where: { sessionId_stepNumber: { sessionId: session.id, stepNumber: session.currentStep } },
  });
}

// Evaluates an invite code that has no active session yet bound to *this*
// request's cookies, deciding between not_available / already_used /
// resuming an existing session for the same device / a fresh pre-session
// state (not_yet_available / needs_consent).
export async function evaluateInviteCodeState(
  inviteCode: Pick<InviteCode, "id" | "status" | "expiresAt">,
  event: Event,
  participantCode?: string,
): Promise<PublicState> {
  if (BLOCKING_CODE_STATUSES.has(inviteCode.status)) {
    return { kind: "not_available" };
  }
  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
    return { kind: "not_available" };
  }
  if (eventIsUnavailable(event)) {
    return { kind: "not_available" };
  }
  if (inviteCode.status === "arrived") {
    return { kind: "already_used" };
  }

  const existingActive = await prisma.session.findFirst({
    where: { inviteCodeId: inviteCode.id, status: "active" },
  });

  if (existingActive) {
    const deviceMatches = await deviceTokenMatchesSession(existingActive);
    if (!deviceMatches) {
      return { kind: "already_used" };
    }

    // Same device, but the participant_session cookie was lost — resume by
    // rotating the session token rather than minting a brand-new session.
    const rawToken = generateRandomToken();
    const resumed = await prisma.session.update({
      where: { id: existingActive.id },
      data: { sessionTokenHash: sha256Hex(rawToken), lastSeenAt: new Date() },
    });
    await issueParticipantSession({ sessionId: resumed.id, sessionTokenRaw: rawToken, participantCode });
    const currentStep = await currentRouteStepFor(resumed);
    return projectActiveSession({ event, session: resumed, currentStep, participantCode });
  }

  if (USED_CODE_STATUSES.has(inviteCode.status)) {
    return { kind: "already_used" };
  }

  return projectPreSessionState(event, participantCode);
}

export async function resolveCurrentPublicState(): Promise<PublicState> {
  const ctx = await getParticipantSessionContext();
  if (ctx) {
    const matches = await deviceTokenMatchesSession(ctx);
    if (!matches) {
      return { kind: "already_used" };
    }
    const currentStep = await currentRouteStepFor(ctx);
    return projectActiveSession({
      event: ctx.inviteCode.event,
      session: ctx,
      currentStep,
      participantCode: ctx.participantCode,
    });
  }

  const codeRef = await readCodeRef();
  if (!codeRef) {
    return { kind: "invalid" };
  }

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { id: codeRef.inviteCodeId },
    include: { event: true },
  });
  if (!inviteCode || inviteCode.codeHash !== codeRef.codeHash) return { kind: "invalid" };

  return evaluateInviteCodeState(inviteCode, inviteCode.event, codeRef.codeDisplay);
}
