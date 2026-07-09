import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { PageWithSubNav } from "@/components/admin/PageWithSubNav";
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <PageWithSubNav
      eventId={id}
      activeTab="announcements"
      header={<h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>}
    >
      <AnnouncementComposer eventId={id} />
    </PageWithSubNav>
  );
}
