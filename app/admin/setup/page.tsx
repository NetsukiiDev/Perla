import { redirect } from "next/navigation";
import { isDatabaseConfigured, isSetupComplete, runtimeProvider, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { isVercel } from "@/lib/env";
import { getVercelSetupState, missingEnvVars } from "@/lib/vercel-setup";
import { PageShell } from "@/components/public/PageShell";
import { SetupWizard } from "@/components/admin/SetupWizard";
import { VercelSetupGuide } from "@/components/admin/VercelSetupGuide";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  // ── Vercel: guida configurazione ───────────────────────────────────
  // On Vercel the DB + secrets come from env vars, so instead of the wizard
  // we show a config guide until everything is set and an admin exists.
  if (isVercel()) {
    const state = await getVercelSetupState();

    // Admin already exists → nothing to do here (redirect outside any try).
    if (state === "ready") {
      redirect("/admin/login");
    }

    if (state === "needs-env") {
      return (
        <PageShell>
          <VercelSetupGuide state="needs-env" missing={missingEnvVars()} />
        </PageShell>
      );
    }

    if (state === "db-unreachable") {
      return (
        <PageShell>
          <VercelSetupGuide
            state="db-unreachable"
            missing={[]}
            error="Database non raggiungibile. Verifica le credenziali nelle env vars di Vercel."
          />
        </PageShell>
      );
    }

    // state === "needs-admin": env pronte e DB raggiungibile, manca l'admin.
    return (
      <PageShell>
        <h1 className="mb-1 text-center text-lg font-medium">Configurazione iniziale</h1>
        <p className="mb-4 text-center text-sm text-muted">Crea il primo account amministratore.</p>
        <SetupWizard initialStep="admin" currentProvider={runtimeProvider()} />
      </PageShell>
    );
  }

  // ── Non-Vercel: wizard standard ────────────────────────────────────
  // Stale-state recovery: if the config file says setup is done but the
  // DB has no admin users (e.g. after `prisma migrate reset`), reset the
  // config so the wizard shows again.
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
