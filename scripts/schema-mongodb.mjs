// Transforms prisma/schema.prisma to a MongoDB-compatible version.
// Removes @db.* annotations (not supported by MongoDB), converts
// onDelete: SetNull to onDelete: NoAction, and sets provider to mongodb.
//
// Run via: node scripts/schema-mongodb.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");
let content = readFileSync(schemaPath, "utf8");

// 1. Set datasource provider to mongodb.
content = content.replace(
  /(provider\s*=\s*")[^"]*(")/,
  '$1mongodb$2',
);

// 2. Remove all @db.* annotations (e.g. @db.VarChar(255), @db.Text).
content = content.replace(/ @db\.\w+(\([^)]*\))?/g, "");

// 3. Convert onDelete: SetNull to onDelete: NoAction (not supported by MongoDB).
content = content.replace(/onDelete:\s*SetNull/g, "onDelete: NoAction");

writeFileSync(schemaPath, content);
console.log("Schema transformed for MongoDB (provider=mongodb, @db.* removed, SetNull→NoAction).");
