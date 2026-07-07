import { redirect } from "next/navigation";
import { isDatabaseConfigured, isSetupComplete, runtimeProvider, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { isVercel } from "@/lib/env";
import { PageShell } from "@/components/public/PageShell";
import { SetupWizard } from "@/components/admin/SetupWizard";
import { VercelSetupGuide } from "@/components/admin/VercelSetupGuide";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  // ── Vercel: guida configurazione ───────────────────────────────────
  if (isVercel()) {
    const dbUrlSet = Boolean(process.env.DATABASE_URL);

    if (!dbUrlSet) {
      return (
        <PageShell>
          <VercelSetupGuide dbConfigured={false} error={null} />
        </PageShell>
      );
    }

    // Keep redirect() and JSX out of the try: redirect() signals via a thrown
    // error, so catching here would swallow it, and constructing JSX inside a
    // try/catch can't actually catch render errors anyway.
    let adminCount: number;
    try {
      adminCount = await prisma.adminUser.count();
    } catch {
      // DB non raggiungibile — mostra errore nella guida
      return (
        <PageShell>
          <VercelSetupGuide dbConfigured={true} error="Database non raggiungibile. Verifica le credenziali nelle env vars di Vercel." />
        </PageShell>
      );
    }

    if (adminCount > 0) {
      redirect("/admin/login");
    }

    // DB raggiungibile — mostra solo form creazione admin
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
