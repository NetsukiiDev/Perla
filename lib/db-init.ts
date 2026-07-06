// Database bootstrap used by the setup wizard: test a connection, then
// create the schema via `prisma db push`. Node runtime only (spawns the
// Prisma CLI and loads native drivers) — not usable on the Edge runtime.
import { spawn } from "node:child_process";
import { join } from "node:path";
import type { DbProvider } from "./config";
import { toMariadbDriverUrl, toPrismaMysqlUrl } from "./db-url";

export class DbInitError extends Error {}

// Node connection failures (e.g. ECONNREFUSED) can surface as an
// AggregateError whose top-level `.message` is empty — dig out something
// useful for the admin.
function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; errors?: unknown[] };
    if (e.message) return e.message;
    if (e.code) return e.code;
    if (Array.isArray(e.errors)) {
      const inner = e.errors.find((x) => x && typeof x === "object" && "message" in x) as
        | { message?: string; code?: string }
        | undefined;
      if (inner?.message) return inner.message;
      if (inner?.code) return inner.code;
    }
  }
  return "database non raggiungibile";
}

// Verifies credentials/reachability with the native driver — no Prisma, so
// it works regardless of which provider the generated client targets.
export async function testConnection(provider: DbProvider, url: string): Promise<void> {
  try {
    if (provider === "mongodb") {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
      try {
        await client.db().admin().ping();
      } finally {
        await client.close();
      }
    } else if (provider === "mysql" || provider === "mariadb") {
      const { createConnection } = await import("mariadb");
      const conn = await createConnection(toMariadbDriverUrl(url));
      try {
        await conn.query("SELECT 1");
      } finally {
        await conn.end();
      }
    } else {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: url });
      await client.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        await client.end();
      }
    }
  } catch (err) {
    throw new DbInitError(`Connessione fallita: ${describeError(err)}`);
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(new DbInitError(err.message)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new DbInitError(stderr.trim() || `Comando terminato con codice ${code}.`));
    });
  });
}

// Sets the schema provider then pushes the schema to the target database.
// Provider change vs the running process is handled by the caller (restart).
// Note: Prisma 7's `db push` has no --skip-generate flag; the datasource URL
// is passed explicitly via --url (and env, which prisma.config.ts reads).
export async function pushSchema(provider: DbProvider, url: string): Promise<void> {
  // Prisma's schema engine wants mysql:// for the mysql provider; the
  // mariadb driver's mariadb:// scheme would be rejected here.
  // MongoDB uses its own mongodb:// scheme directly.
  const prismaUrl = provider === "mysql" || provider === "mariadb" ? toPrismaMysqlUrl(url) : url;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_PROVIDER: provider,
    DATABASE_URL: prismaUrl,
  };

  const node = process.execPath;
  await run(node, [join(process.cwd(), "scripts", "prisma-provider.mjs")], env);
  await run(
    node,
    [
      join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
      "db",
      "push",
      "--url",
      prismaUrl,
      "--accept-data-loss",
    ],
    env,
  );
}
