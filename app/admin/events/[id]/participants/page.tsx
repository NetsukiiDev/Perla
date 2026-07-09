import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { getParticipantsForEvent } from "@/lib/admin-participant-view";
import { decrypt } from "@/lib/crypto";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventSubNav } from "@/components/admin/EventSubNav";
import { EventInactiveNotice } from "@/components/admin/EventInactiveNotice";
import { ParticipantsManager } from "@/components/admin/ParticipantsManager";
import { PublicCodesPanel } from "@/components/admin/PublicCodesPanel";

export const dynamic = "force-dynamic";

function requestBaseUrl(headersList: Headers): string | null {
  const host = headersList.get("host");
  if (!host) return null;

  const forwardedProto = headersList.get("x-forwarded-proto");
  if (forwardedProto) return `${forwardedProto.split(",")[0].trim()}://${host}`;

  const referer = headersList.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${host}`;
    } catch {
      // fall through
    }
  }

  return `https://${host}`;
}

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const participants = await getParticipantsForEvent(id);
  const publicCodes = await prisma.inviteCode.findMany({
    where: { eventId: id, isPublic: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });
  const headersList = await headers();
  const baseUrl = requestBaseUrl(headersList) ?? "";

  return (
    <AdminContainer>
      <h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>
      <EventSubNav eventId={id} active="participants" />
      <EventInactiveNotice status={event.status} />
      <div className="mb-6">
        <PublicCodesPanel
          eventId={id}
          initialBaseUrl={baseUrl}
          initialCodes={publicCodes.map((c) => ({
            id: c.id,
            code: c.codeEncrypted ? decrypt(c.codeEncrypted) : null,
            maxSessions: c.maxSessions,
            used: c._count.sessions,
            status: c.status,
          }))}
        />
      </div>
      <ParticipantsManager
        eventId={id}
        initialBaseUrl={baseUrl}
        initialParticipants={participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          code: p.code,
          codeId: p.codeId,
          codeStatus: p.codeStatus,
          displayStatus: p.displayStatus,
          currentStep: p.currentStep,
          stepsCount: p.stepsCount,
          lastLocation: p.lastLocation,
        }))}
      />
    </AdminContainer>
  );
}
