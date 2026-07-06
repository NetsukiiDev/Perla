// Prisma CLI configuration (generate/migrate/seed). Application code does
// NOT use this file — PrismaClient connects via the driver adapter in
// lib/db.ts instead. See https://pris.ly/d/prisma7-client-config
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
