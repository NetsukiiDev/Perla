// GET /api/admin/setup/vercel-test — verifica che il progetto sia pronto su
// Vercel: prima che TUTTE le env vars richieste siano presenti (DATABASE_URL
// + i secrets dell'app), poi che il database sia raggiungibile. Non crea
// tabelle. Usato dalla guida di setup in modalità Vercel prima di sbloccare
// la creazione dell'account amministratore.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { missingEnvVars } from "@/lib/vercel-setup";

export const runtime = "nodejs";

export async function GET() {
  const missing = missingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, code: "missing_env", missing, message: `Variabili mancanti: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connessione fallita";
    return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
  }
}
