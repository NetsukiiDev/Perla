import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventSubNav } from "@/components/admin/EventSubNav";
import { LiveDashboard } from "@/components/admin/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <AdminContainer>
      <h1 className="mb-2 text-xl font-semibold">{event.internalName}</h1>
      <EventSubNav eventId={id} active="live" />
      <LiveDashboard eventId={id} />
    </AdminContainer>
  );
}
