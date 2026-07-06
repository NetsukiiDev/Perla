// Admin-only projections for participants: joins the latest invite code
// metadata, latest session, and last known position (decrypted) into a
// single view used by the participants list and detail pages.
import { prisma } from "@/lib/db";
import { decrypt, decryptCoord } from "@/lib/crypto";
import type { SessionStatus } from "@/lib/generated/prisma/client";
import { deriveDisplayStatus, type DisplayStatus } from "@/lib/status";

export interface ParticipantView {
  id: string;
  displayName: string | null;
  notes: string | null;
  code: string | null;
  codeId: string | null;
  codeStatus: string | null;
  sessionId: string | null;
  sessionStatus: string | null;
  displayStatus: DisplayStatus;
  currentStep: number | null;
  stepsCount: number;
  lastLocation: { lat: number; lng: number } | null;
  lastSeenAt: string | null;
  ipAddress: string | null;
  ipIsp: string | null;
}

const participantInclude = {
  event: { select: { stepsCount: true } },
  inviteCodes: { orderBy: { createdAt: "desc" }, take: 1 },
  accessLogs: { where: { type: "code_verify_success" as const }, take: 1 },
  sessions: {
    orderBy: { startedAt: "desc" },
    take: 1,
    include: { locationUpdates: { orderBy: { createdAt: "desc" }, take: 1 } },
  },
} as const;

type ParticipantWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.participant.findFirst>>
> & {
  event: { stepsCount: number };
  inviteCodes: { id: string; status: string; codeEncrypted: string | null }[];
  accessLogs: unknown[];
  sessions: {
    id: string;
    status: SessionStatus;
    currentStep: number;
    lastSeenAt: Date;
    ipAddressEncrypted: string | null;
    ipIsp: string | null;
    locationUpdates: { latEncrypted: string; lngEncrypted: string }[];
  }[];
};

function toView(p: ParticipantWithRelations): ParticipantView {
  const code = p.inviteCodes[0] ?? null;
  const session = p.sessions[0] ?? null;
  const loc = session?.locationUpdates[0] ?? null;

  return {
    id: p.id,
    displayName: p.displayName,
    notes: p.notes,
    code: code?.codeEncrypted ? decrypt(code.codeEncrypted) : null,
    codeId: code?.id ?? null,
    codeStatus: code?.status ?? null,
    sessionId: session?.id ?? null,
    sessionStatus: session?.status ?? null,
    displayStatus: deriveDisplayStatus({
      hasOpenedSite: p.accessLogs.length > 0,
      session: session ? { status: session.status, currentStep: session.currentStep } : null,
    }),
    currentStep: session?.currentStep ?? null,
    stepsCount: p.event.stepsCount,
    lastLocation: loc ? { lat: decryptCoord(loc.latEncrypted), lng: decryptCoord(loc.lngEncrypted) } : null,
    lastSeenAt: session?.lastSeenAt.toISOString() ?? null,
    ipAddress: session?.ipAddressEncrypted ? decrypt(session.ipAddressEncrypted) : null,
    ipIsp: session?.ipIsp ?? null,
  };
}

export async function getParticipantsForEvent(eventId: string): Promise<ParticipantView[]> {
  const participants = await prisma.participant.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: participantInclude,
  });
  return participants.map((p) => toView(p as unknown as ParticipantWithRelations));
}

export async function getParticipantView(participantId: string): Promise<ParticipantView | null> {
  const p = await prisma.participant.findUnique({
    where: { id: participantId },
    include: participantInclude,
  });
  return p ? toView(p as unknown as ParticipantWithRelations) : null;
}
