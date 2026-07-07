// POST /api/admin/setup/vercel-test — verifica che il database sia
// raggiungibile con la DATABASE_URL fornita (o quella di default
// dall'ambiente). Usa il driver mariadb direttamente (invece di
// PrismaClient, che in v7 non accetta datasourceUrl nel costruttore).
import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

export const runtime = "nodejs";

interface ConnConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDbUrl(url: string): ConnConfig | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const port = parseInt(u.port, 10) || 3306;
    const user = decodeURIComponent(u.username);
    const password = decodeURIComponent(u.password);
    const database = u.pathname.replace(/^\//, "");
    return { host, port, user, password, database };
  } catch {
    return null;
  }
}

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

  const cfg = parseDbUrl(url);
  if (!cfg) {
    return NextResponse.json(
      { ok: false, code: "invalid_url", message: "DATABASE_URL non valida." },
      { status: 400 },
    );
  }

  try {
    const conn = await mariadb.createConnection(cfg);
    await conn.query("SELECT 1");
    await conn.end();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connessione fallita";
    return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
  }
}
