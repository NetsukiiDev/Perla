import { requireAdminPage } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdminPage(["admin"]);
  const t = getDictionary(await getLocale());

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">{t.settings.title}</h1>
      <SettingsPanel />
    </AdminContainer>
  );
}
