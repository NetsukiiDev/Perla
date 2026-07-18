import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { decryptCoord } from "@/lib/crypto";
import { PageWithSubNav } from "@/components/admin/PageWithSubNav";
import { EventForm } from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const isAdmin = user.role === "admin";
  const owners = isAdmin
    ? await prisma.adminUser.findMany({ select: { id: true, email: true, role: true }, orderBy: { email: "asc" } })
    : [];

  return (
    <PageWithSubNav
      eventId={id}
      activeTab="edit"
      header={<h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>}
    >
      <EventForm
        canReassignOwner={isAdmin}
        owners={owners}
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
          createdById: event.createdById,
        }}
      />
    </PageWithSubNav>
  );
}
