import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { PageShell } from "@/components/public/PageShell";
import { getCurrentAdminUser } from "@/lib/admin-guard";
import { isDatabaseConfigured, isSetupComplete, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/events";
  return value;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  // ── Stale-state recovery ───────────────────────────────────────────
  // Config says setup is complete but no admin users exist (DB was reset).
  if (isSetupComplete() && isDatabaseConfigured()) {
    try {
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0) {
        clearSetupConfig();
      }
    } catch {
      // DB unreachable — show login as-is.
    }
  }

  // First run: nothing configured yet sends visitors to the setup wizard.
  if (!isSetupComplete()) {
    redirect("/admin/setup");
  }

  if (await getCurrentAdminUser()) {
    redirect("/admin/events");
  }

  const query = await searchParams;
  const nextPath = safeNextPath(firstValue(query.next));
  const error = firstValue(query.error);

  return (
    <PageShell>
      <h1 className="mb-4 text-center text-lg font-medium">Area amministratore</h1>
      <LoginForm nextPath={nextPath} error={error} />
    </PageShell>
  );
}
