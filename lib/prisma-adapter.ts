// Chooses the Prisma driver adapter at runtime from the active DB config
// (config file first, then env — see lib/config.ts). Keep the provider set
// in sync with scripts/prisma-provider.mjs (which sets the schema provider
// for generate/migrate).
//
// MongoDB uses the built-in Prisma client (no external adapter needed).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getDbConfig } from "./config";
import { toMariadbDriverUrl } from "./db-url";

export function createDriverAdapter() {
  const config = getDbConfig();
  if (!config) {
    throw new Error("Database not configured. Complete setup at /admin/setup or set DATABASE_URL.");
  }

  if (config.provider === "mongodb") {
    return undefined;
  }

  if (config.provider === "mysql" || config.provider === "mariadb") {
    // @prisma/adapter-mariadb drives both MySQL and MariaDB, but the Node
    // driver requires the mariadb:// scheme (it rejects mysql://).
    return new PrismaMariaDb(toMariadbDriverUrl(config.url));
  }

  return new PrismaPg({ connectionString: config.url });
}
