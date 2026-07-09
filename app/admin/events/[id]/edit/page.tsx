import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { decryptCoord } from "@/lib/crypto";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventSubNav } from "@/components/admin/EventSubNav";
import { EventForm } from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <AdminContainer>
      <h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>
      <EventSubNav eventId={id} active="edit" />
      <EventForm
        initial={{
          id: event.id,
          internalName: event.internalName,
          destinationLat: decryptCoord(event.destinationLatEncrypted),
          destinationLng: decryptCoord(event.destinationLngEncrypted),
          revealAt: event.revealAt ? event.revealAt.toISOString() : null,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt ? event.endsAt.toISOString() : null,
          status: event.status,
          stepsCount: event.stepsCount,
          unlockRadiusM: event.unlockRadiusM,
          showTotalDistance: event.showTotalDistance,
          showTotalDuration: event.showTotalDuration,
          showTollInfo: event.showTollInfo,
          notes: event.notes,
        }}
      />
    </AdminContainer>
  );
}
