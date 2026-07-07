// Prisma forbids env() in the datasource `provider` field, so we patch the
// provider literal in prisma/schema.prisma before `prisma generate` /
// `prisma migrate` run, based on DATABASE_PROVIDER.
//
//   DATABASE_PROVIDER=postgresql   -> provider "postgresql"  (default)
//   DATABASE_PROVIDER=mysql        -> provider "mysql"
//   DATABASE_PROVIDER=mariadb      -> provider "mysql"  (MariaDB uses the
//                                     mysql provider + @prisma/adapter-mariadb)
//   DATABASE_PROVIDER=mongodb      -> provider "mongodb" (also strips @db.*)
//
// The runtime driver adapter is chosen separately in lib/prisma-adapter.ts.
try {
  await import("dotenv/config");
} catch {
  // dotenv not available — env vars come from the platform (e.g. Vercel)
}
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raw = (process.env.DATABASE_PROVIDER ?? "postgresql").toLowerCase();
let schemaProvider =
  raw === "mysql" || raw === "mariadb" ? "mysql" : raw === "postgresql" || raw === "postgres" ? "postgresql" : raw === "mongodb" ? "mongodb" : null;

if (!schemaProvider) {
  console.error(`Unsupported DATABASE_PROVIDER "${raw}". Use postgresql, mysql, mariadb or mongodb.`);
  process.exit(1);
}

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
let content = readFileSync(schemaPath, "utf8");

// Replace only the provider inside the `datasource db { ... }` block.
content = content.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]*(")/s,
  `$1${schemaProvider}$2`,
);

if (schemaProvider === "mongodb") {
  // MongoDB doesn't support @db.* annotations or onDelete: SetNull.
  content = content.replace(/ @db\.\w+(\([^)]*\))?/g, "");
  content = content.replace(/onDelete:\s*SetNull/g, "onDelete: NoAction");
}

// Serverless platforms (e.g. Vercel) deploy the app to a read-only filesystem —
// only /tmp is writable at runtime. The setup wizard (lib/db-init.ts) points
// this at a /tmp path via PRISMA_SCHEMA_OUT; every other caller (db:generate,
// db:migrate, vercel-build, ...) runs where the repo itself is writable and
// keeps mutating prisma/schema.prisma in place.
const outputPath = process.env.PRISMA_SCHEMA_OUT || schemaPath;
writeFileSync(outputPath, content);
console.log(`Prisma datasource provider set to "${schemaProvider}" (DATABASE_PROVIDER=${raw}). Schema written to ${outputPath}.`);
