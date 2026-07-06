import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventsTable } from "@/components/admin/EventsTable";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  await requireAdminPage();

  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <AdminContainer>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventi</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus size={16} aria-hidden="true" />
          Nuovo evento
        </Link>
      </div>
      <EventsTable
        events={events.map((e) => ({
          id: e.id,
          internalName: e.internalName,
          region: e.region,
          status: e.status,
          startsAt: e.startsAt.toISOString(),
        }))}
      />
    </AdminContainer>
  );
}
