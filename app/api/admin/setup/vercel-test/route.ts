// POST /api/admin/setup/vercel-test — verifica che il database sia
// raggiungibile con la DATABASE_URL fornita, poi inizializza lo schema
// (prisma db push). Usa il driver mariadb direttamente per il test di
// connessione, e pushSchema() da lib/db-init per creare le tabelle.
import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { pushSchema } from "@/lib/db-init";
import type { DbProvider } from "@/lib/config";

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

function detectProvider(url: string, fallback: string): DbProvider {
  const raw = url.startsWith("mongodb://") || url.startsWith("mongodb+srv://")
    ? "mongodb"
    : fallback;
  if (raw === "postgresql" || raw === "postgres" || raw === "mysql" || raw === "mariadb" || raw === "mongodb") {
    return raw as DbProvider;
  }
  return "postgresql";
}

export async function POST(req: NextRequest) {
  let url: string | undefined;
  let provider: string | undefined;
  try {
    const body = await req.json();
    url = body?.databaseUrl || process.env.DATABASE_URL;
    provider = body?.provider || process.env.DATABASE_PROVIDER;
  } catch {
    url = process.env.DATABASE_URL;
    provider = process.env.DATABASE_PROVIDER;
  }

  if (!url) {
    return NextResponse.json(
      { ok: false, code: "missing_url", message: "DATABASE_URL non specificata." },
      { status: 400 },
    );
  }

  const resolvedProvider = detectProvider(url, provider || "postgresql");

  // Test connessione con driver nativo
  if (resolvedProvider === "mysql" || resolvedProvider === "mariadb") {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connessione fallita";
      return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
    }
  } else if (resolvedProvider === "postgresql") {
    try {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: url });
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connessione fallita";
      return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
    }
  } else if (resolvedProvider === "mongodb") {
    try {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
      await client.db().admin().ping();
      await client.close();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connessione fallita";
      return NextResponse.json({ ok: false, code: "db_unreachable", message }, { status: 503 });
    }
  }

  // Connessione OK — inizializza lo schema
  try {
    await pushSchema(resolvedProvider, url);
    return NextResponse.json({ ok: true, tablesCreated: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creazione tabelle fallita";
    return NextResponse.json({ ok: true, tablesCreated: false, message }, { status: 500 });
  }
}
