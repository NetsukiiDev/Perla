import { redirect } from "next/navigation";
import { CodeEntryForm } from "@/components/public/CodeEntryForm";
import { PageShell } from "@/components/public/PageShell";
import { isDatabaseConfigured, isSetupComplete, clearSetupConfig } from "@/lib/config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ error?: string | string[]; code?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
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

  const query = await searchParams;

  return (
    <PageShell>
      <CodeEntryForm error={firstValue(query.error)} defaultCode={firstValue(query.code)} />
    </PageShell>
  );
}
