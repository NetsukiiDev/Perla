import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { decryptCoord } from "@/lib/crypto";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventSubNav } from "@/components/admin/EventSubNav";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EventStatusControl } from "@/components/admin/EventStatusControl";
import { EventInactiveNotice } from "@/components/admin/EventInactiveNotice";
import { EventOverview } from "@/components/admin/EventOverview";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const t = getDictionary(await getLocale());

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { participants: true, inviteCodes: true } } },
  });
  if (!event) notFound();

  const [activeCodes, disabledCodes, activeSessions, travelingParticipants, arrivedParticipants] = await Promise.all([
    prisma.inviteCode.count({
      where: { eventId: id, status: { in: ["created", "valid", "scheduled", "started", "in_progress"] } },
    }),
    prisma.inviteCode.count({
      where: { eventId: id, status: { in: ["revoked", "blocked", "deleted", "expired"] } },
    }),
    prisma.session.count({ where: { participant: { eventId: id }, status: "active" } }),
    prisma.participant.count({ where: { eventId: id, status: { in: ["started", "in_progress"] } } }),
    prisma.participant.count({ where: { eventId: id, status: "arrived" } }),
  ]);

  return (
    <AdminContainer>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{event.internalName}</h1>
          <p className="text-sm text-muted">{event.region}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={event.status} label={t.events.statusOptions[event.status as keyof typeof t.events.statusOptions] ?? event.status} />
          <EventStatusControl eventId={id} status={event.status} />
        </div>
      </div>

      <EventSubNav eventId={id} active="overview" />

      <EventInactiveNotice status={event.status} />

      <EventOverview
        eventId={id}
        event={{
          internalName: event.internalName,
          region: event.region,
          destinationLat: decryptCoord(event.destinationLatEncrypted),
          destinationLng: decryptCoord(event.destinationLngEncrypted),
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt ? event.endsAt.toISOString() : null,
          revealAt: event.revealAt ? event.revealAt.toISOString() : null,
          stepsCount: event.stepsCount,
          unlockRadiusM: event.unlockRadiusM,
          showTotalDistance: event.showTotalDistance,
          showTotalDuration: event.showTotalDuration,
          showTollInfo: event.showTollInfo,
          notes: event.notes,
        }}
        stats={{
          participants: event._count.participants,
          codes: event._count.inviteCodes,
          activeCodes,
          disabledCodes,
          activeSessions,
          travelingParticipants,
          arrivedParticipants,
        }}
      />
    </AdminContainer>
  );
}
