// Shared resolution logic for "what should this participant see right
// now", used by GET /api/session/current AND the /c page's server
// component (which calls it directly instead of self-fetching the route).
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/hash";
import {
  deviceTokenMatchesSession,
  getDeviceTokenHashFromCookie,
  getParticipantSessionContext,
  issueParticipantSession,
  readCodeRef,
} from "@/lib/session-participant";
import { projectActiveSession, projectPreSessionState, type PublicState } from "@/lib/public-projection";
import type { Event, InviteCode, Session } from "@/lib/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n/types";
import { getLocale, getDictionary } from "@/lib/i18n/server";

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

// Same device, but the participant_session cookie was lost — resume by
// rotating the session token rather than minting a brand-new session.
async function resumeSessionState(session: Session, event: Event, t: Dictionary, participantCode?: string): Promise<PublicState> {
  const rawToken = generateRandomToken();
  const resumed = await prisma.session.update({
    where: { id: session.id },
    data: { sessionTokenHash: sha256Hex(rawToken), lastSeenAt: new Date() },
  });
  await issueParticipantSession({ sessionId: resumed.id, sessionTokenRaw: rawToken, participantCode });
  const currentStep = await currentRouteStepFor(resumed);
  return projectActiveSession({ event, session: resumed, currentStep, participantCode, t });
}

// Public codes are reusable by many devices: resolve strictly by THIS device's
// own session (never "already_used" for others), and gate new devices on the
// usage cap (maxSessions).
async function evaluatePublicCodeState(
  inviteCode: Pick<InviteCode, "id" | "maxSessions">,
  event: Event,
  t: Dictionary,
  participantCode?: string,
): Promise<PublicState> {
  const deviceHash = await getDeviceTokenHashFromCookie();
  const mySession = deviceHash
    ? await prisma.session.findFirst({
        where: { inviteCodeId: inviteCode.id, deviceTokenHash: deviceHash },
        orderBy: { startedAt: "desc" },
      })
    : null;

  if (mySession) {
    if (mySession.status === "active") return resumeSessionState(mySession, event, t, participantCode);
    if (mySession.status === "completed") return { kind: "arrived" };
    return { kind: "not_available" }; // blocked / expired
  }

  // New device: enforce the usage cap before offering consent.
  const used = await prisma.session.count({ where: { inviteCodeId: inviteCode.id } });
  if (used >= inviteCode.maxSessions) return { kind: "not_available" };
  return projectPreSessionState(event, t, participantCode);
}

// Evaluates an invite code that has no active session yet bound to *this*
// request's cookies, deciding between not_available / already_used /
// resuming an existing session for the same device / a fresh pre-session
// state (not_yet_available / needs_consent).
export async function evaluateInviteCodeState(
  inviteCode: Pick<InviteCode, "id" | "status" | "expiresAt" | "isPublic" | "maxSessions">,
  event: Event,
  t: Dictionary,
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

  if (inviteCode.isPublic) {
    return evaluatePublicCodeState(inviteCode, event, t, participantCode);
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
    return resumeSessionState(existingActive, event, t, participantCode);
  }

  if (USED_CODE_STATUSES.has(inviteCode.status)) {
    return { kind: "already_used" };
  }

  return projectPreSessionState(event, t, participantCode);
}

export async function resolveCurrentPublicState(): Promise<PublicState> {
  const locale = await getLocale();
  const t = getDictionary(locale);
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
      t,
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

  return evaluateInviteCodeState(inviteCode, inviteCode.event, t, codeRef.codeDisplay);
}
