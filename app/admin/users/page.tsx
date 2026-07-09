import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdminPage(["admin"]);
  const t = getDictionary(await getLocale());

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return (
    <AdminContainer>
      <h1 className="mb-6 text-xl font-semibold">{t.users.title}</h1>
      <UsersPanel
        currentUserId={me.id}
        initialUsers={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </AdminContainer>
  );
}
