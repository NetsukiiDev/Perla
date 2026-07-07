import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { getParticipantsForEvent } from "@/lib/admin-participant-view";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventSubNav } from "@/components/admin/EventSubNav";
import { EventInactiveNotice } from "@/components/admin/EventInactiveNotice";
import { TicketGenerator } from "@/components/admin/TicketGenerator";

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

export default async function TicketsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const participants = await getParticipantsForEvent(id);
  const headersList = await headers();
  const baseUrl = requestBaseUrl(headersList) ?? "";

  return (
    <AdminContainer>
      <h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>
      <EventSubNav eventId={id} active="tickets" />
      <EventInactiveNotice status={event.status} />
      <TicketGenerator
        eventId={id}
        event={{
          internalName: event.internalName,
          region: event.region,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt ? event.endsAt.toISOString() : null,
        }}
        initialBaseUrl={baseUrl}
        entries={participants.map((p) => ({
          id: p.id,
          codeId: p.codeId,
          code: p.code,
          displayName: p.displayName,
        }))}
      />
    </AdminContainer>
  );
}
