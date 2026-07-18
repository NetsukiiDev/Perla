import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventsTable } from "@/components/admin/EventsTable";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await requireAdminPage();
  const t = getDictionary(await getLocale());

  const events = await prisma.event.findMany({
    where: user.role === "admin" ? {} : { createdById: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminContainer>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.events.title}</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus size={16} aria-hidden="true" />
          {t.events.newButton}
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
