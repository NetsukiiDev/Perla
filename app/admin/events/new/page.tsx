import { requireAdminPage } from "@/lib/admin-guard";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { EventForm } from "@/components/admin/EventForm";

export default async function NewEventPage() {
  await requireAdminPage();

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">Nuovo evento</h1>
      <EventForm />
    </AdminContainer>
  );
}
