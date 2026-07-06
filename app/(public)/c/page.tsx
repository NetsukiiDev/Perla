import { redirect } from "next/navigation";
import { isDatabaseConfigured, isSetupComplete, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { resolveCurrentPublicState } from "@/lib/code-resolution";
import { PageShell } from "@/components/public/PageShell";
import { ParticipantFlow } from "@/components/public/ParticipantFlow";

// No caching: this must always reflect the latest session/event state.
export const dynamic = "force-dynamic";

export default async function ParticipantPage() {
  // ── Stale-state recovery ───────────────────────────────────────────
  if (isSetupComplete() && isDatabaseConfigured()) {
    try {
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0) {
        clearSetupConfig();
      }
    } catch {
      // DB unreachable — let redirect handle it.
    }
  }

  if (!isSetupComplete()) {
    redirect("/admin/setup");
  }

  const state = await resolveCurrentPublicState();

  return (
    <PageShell>
      <ParticipantFlow initialState={state} />
    </PageShell>
  );
}
