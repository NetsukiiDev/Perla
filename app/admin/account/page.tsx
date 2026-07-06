import { requireAdminPage } from "@/lib/admin-guard";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { AccountForm } from "@/components/admin/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAdminPage();

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">Il mio account</h1>
      <AccountForm email={user.email} />
    </AdminContainer>
  );
}
