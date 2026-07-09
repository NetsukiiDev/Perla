import { requireAdminPage } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventForm } from "@/components/admin/EventForm";

export default async function NewEventPage() {
  await requireAdminPage();
  const t = getDictionary(await getLocale());

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">{t.events.newButton}</h1>
      <EventForm />
    </AdminContainer>
  );
}
