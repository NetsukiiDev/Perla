import { redirect } from "next/navigation";
import { isDatabaseConfigured, isSetupComplete, runtimeProvider, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/public/PageShell";
import { SetupWizard } from "@/components/admin/SetupWizard";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  // ── Stale-state recovery ───────────────────────────────────────────
  // If the config file says setup is done but the DB has no admin users
  // (e.g. after `prisma migrate reset`), reset the config so the wizard
  // shows again.
  if (isSetupComplete() && isDatabaseConfigured()) {
    try {
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0) {
        clearSetupConfig();
      }
    } catch {
      // DB unreachable — leave config as-is and let the wizard handle it.
    }
  }

  if (isSetupComplete()) {
    redirect("/admin/login");
  }

  const dbConfigured = isDatabaseConfigured();

  return (
    <PageShell>
      <h1 className="mb-1 text-center text-lg font-medium">Configurazione iniziale</h1>
      <p className="mb-4 text-center text-sm text-muted">Configura il database e crea il primo account.</p>
      <SetupWizard initialStep={dbConfigured ? "admin" : "database"} currentProvider={runtimeProvider()} />
    </PageShell>
  );
}
