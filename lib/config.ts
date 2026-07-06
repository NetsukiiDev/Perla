// Runtime application config, written by the first-run setup wizard.
//
// The database connection is configured through the UI (not just .env) and
// persisted to .data/config.json (gitignored, like .env — it contains the
// DB password in plaintext on disk). This file is the source of truth for
// "is the site configured yet".
//
// Two modes:
//  - Wizard mode (default): DB config + setup state come from the config
//    file. Until it's complete, the whole site funnels to /admin/setup.
//  - Env mode (SETUP_DISABLED=true): the wizard is disabled and DB config
//    comes from DATABASE_URL/DATABASE_PROVIDER env vars — use this for
//    serverless/prod deployments with a read-only filesystem.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type DbProvider = "postgresql" | "mysql" | "mariadb" | "mongodb";

export interface DbConfig {
  provider: DbProvider;
  url: string;
}

interface AppConfig {
  database?: DbConfig & { configuredAt: string };
  setupCompletedAt?: string;
}

const CONFIG_PATH = join(process.cwd(), ".data", "config.json");

function wizardDisabled(): boolean {
  return process.env.SETUP_DISABLED === "true";
}

function readConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as AppConfig;
  } catch {
    return {};
  }
}

function writeConfig(next: AppConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf8");
}

function envDbConfig(): DbConfig | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const provider = (process.env.DATABASE_PROVIDER ?? "postgresql") as DbProvider;
  return { provider, url };
}

// Connection used by the Prisma adapter at runtime. Config file wins; falls
// back to env so CLI tooling (seed) and env-mode deployments still work.
export function getDbConfig(): DbConfig | null {
  if (wizardDisabled()) return envDbConfig();
  const cfg = readConfig();
  if (cfg.database?.url) {
    return { provider: cfg.database.provider, url: cfg.database.url };
  }
  return envDbConfig();
}

// Strictly whether the wizard has stored a DB connection (env placeholder in
// .env does NOT count, so the wizard still shows on first run).
export function isDatabaseConfigured(): boolean {
  if (wizardDisabled()) return Boolean(envDbConfig());
  return Boolean(readConfig().database?.url);
}

export function isSetupComplete(): boolean {
  if (wizardDisabled()) return true;
  return Boolean(readConfig().setupCompletedAt);
}

export function saveDatabaseConfig(config: DbConfig): void {
  const current = readConfig();
  writeConfig({
    ...current,
    database: { ...config, configuredAt: new Date().toISOString() },
  });
}

export function markSetupComplete(): void {
  const current = readConfig();
  writeConfig({ ...current, setupCompletedAt: new Date().toISOString() });
}

// The provider the running process (and its generated Prisma client) was
// started with. Changing to a different provider needs a regenerate +
// restart, so the wizard compares against this.
export function runtimeProvider(): DbProvider {
  return (process.env.DATABASE_PROVIDER ?? "postgresql") as DbProvider;
}

export function clearSetupConfig(): void {
  writeConfig({});
}
