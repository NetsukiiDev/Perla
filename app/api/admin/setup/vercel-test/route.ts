// GET /api/admin/setup/vercel-test — testa la connessione al database
// su Vercel senza creare tabelle. Usato dalla pagina di setup in modalità
// Vercel per verificare che DATABASE_URL sia raggiungibile.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connessione fallita";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
