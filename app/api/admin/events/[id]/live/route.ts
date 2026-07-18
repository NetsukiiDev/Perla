// GET /api/admin/events/[id]/live - aggregated per-participant state for
// the live dashboard. Decrypts admin-only event and participant locations.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEventAccess } from "@/lib/admin-guard";
import { decrypt, decryptCoord } from "@/lib/crypto";
import { deriveDisplayStatus, type DisplayStatus } from "@/lib/status";

const STATUS_ORDER: Record<DisplayStatus, number> = {
  in_progress: 0,
  started: 1,
  opened_site: 2,
  not_started: 3,
  arrived: 4,
  blocked: 5,
  expired: 6,
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const auth = await requireEventAccess(eventId);
  if ("response" in auth) return auth.response;
  const { event } = auth;

  const participants = await prisma.participant.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: {
      inviteCodes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      accessLogs: {
        where: { type: "code_verify_success" },
        take: 1,
      },
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          locationUpdates: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const rows = participants
    .map((p) => {
      const inviteCode = p.inviteCodes[0] ?? null;
      const session = p.sessions[0] ?? null;
      const lastLocation = session?.locationUpdates[0]
        ? {
            lat: decryptCoord(session.locationUpdates[0].latEncrypted),
            lng: decryptCoord(session.locationUpdates[0].lngEncrypted),
          }
        : null;

      const displayStatus = deriveDisplayStatus({
        hasOpenedSite: p.accessLogs.length > 0,
        session: session ? { status: session.status, currentStep: session.currentStep } : null,
      });

      return {
        participantId: p.id,
        displayName: p.displayName,
        code: inviteCode?.codeEncrypted ? decrypt(inviteCode.codeEncrypted) : null,
        sessionId: session?.id ?? null,
        codeId: inviteCode?.id ?? null,
        codeStatus: inviteCode?.status ?? null,
        sessionStatus: session?.status ?? null,
        displayStatus,
        currentStep: session?.currentStep ?? null,
        stepsCount: event.stepsCount,
        lastSeenAt: session?.lastSeenAt.toISOString() ?? null,
        lastLocation,
        ipAddress: session?.ipAddressEncrypted ? decrypt(session.ipAddressEncrypted) : null,
        ipIsp: session?.ipIsp ?? null,
      };
    })
    .sort((a, b) => {
      const statusDelta = STATUS_ORDER[a.displayStatus] - STATUS_ORDER[b.displayStatus];
      if (statusDelta !== 0) return statusDelta;
      return (b.currentStep ?? 0) - (a.currentStep ?? 0);
    });

  return NextResponse.json({
    eventLocation: {
      lat: decryptCoord(event.destinationLatEncrypted),
      lng: decryptCoord(event.destinationLngEncrypted),
      label: event.internalName,
    },
    participants: rows,
  });
}
