import { getCurrentAdminUser } from "@/lib/admin-guard";
import { getLocale } from "@/lib/i18n/server";
import { Nav } from "@/components/admin/Nav";
import { I18nProvider } from "@/lib/i18n/context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAdminUser();
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {user && <Nav role={user.role} />}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </I18nProvider>
  );
}
