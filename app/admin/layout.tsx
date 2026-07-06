import { getCurrentAdminUser } from "@/lib/admin-guard";
import { Nav } from "@/components/admin/Nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAdminUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {user && <Nav role={user.role} />}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
