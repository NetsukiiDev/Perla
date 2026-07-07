// Prisma client singleton, resolved lazily.
//
// The connection comes from a driver adapter chosen at runtime from the DB
// config (lib/prisma-adapter.ts). Because the DB may not be configured yet
// (first-run setup), the client is built on first *use* via a Proxy rather
// than at import time — importing this module must never throw, so gated
// pages can redirect to /admin/setup before any query runs.
import { PrismaClient } from "./generated/prisma/client";
import { createDriverAdapter } from "./prisma-adapter";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  // Cached on globalThis in every environment (not just dev) so
  // resetPrismaClient() can swap the connection after setup.
  // createDriverAdapter() is undefined for mongodb, which makes TS pick the
  // accelerateUrl branch of the options union; cast to the real options type.
  const options = { adapter: createDriverAdapter() } as ConstructorParameters<typeof PrismaClient>[0];
  const client = new PrismaClient(options);
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

// Drops the cached client so the next access reconnects with fresh config
// (used right after the setup wizard writes a new DB connection).
export async function resetPrismaClient(): Promise<void> {
  const existing = globalForPrisma.prisma;
  globalForPrisma.prisma = undefined;
  if (existing) {
    try {
      await existing.$disconnect();
    } catch {
      // ignore — we're discarding it anyway
    }
  }
}
