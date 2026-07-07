// POST /api/admin/setup/vercel-test — verifica che il database sia
// raggiungibile con la DATABASE_URL fornita (o quella di default
// dall'ambiente). Non controlla gli altri segreti dell'app perché
// vengono impostati su Vercel, non sul server locale. Non crea tabelle.
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = body?.databaseUrl || process.env.DATABASE_URL;
  } catch {
    url = process.env.DATABASE_URL;
  }

  if (!url) {
    return NextResponse.json(
      { ok: false, code: "missing_url", message: "DATABASE_URL non specificata." },
      { status: 400 },
    );
  }

  try {
    const client = new PrismaClient({ datasourceUrl: url } as any);
    await client.$queryRaw`SELECT 1`;
    await client.$disconnect();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connessione fallita";
    return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
  }
}
