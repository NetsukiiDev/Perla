import { requireAdminPage } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { AccountForm } from "@/components/admin/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAdminPage();
  const t = getDictionary(await getLocale());

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">{t.account.title}</h1>
      <AccountForm email={user.email} />
    </AdminContainer>
  );
}
