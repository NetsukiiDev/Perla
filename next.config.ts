import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.100", "100.67.143.53", "windows11-netsukii.note-alphard.ts.net"],
  // Keep the native DB drivers and Prisma out of the bundle — they must run
  // as real Node modules on the server (both pg and mariadb are supported).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "@prisma/adapter-mariadb",
    "pg",
    "mariadb",
    "mongodb",
  ],
  // The setup wizard spawns `scripts/prisma-provider.mjs` and the Prisma CLI
  // as child processes to run `prisma db push`. Next.js's file tracer can't
  // see those dynamic spawn() paths, so schema.prisma and the CLI/engine
  // files it needs would otherwise be missing from the deployed function.
  outputFileTracingIncludes: {
    "/api/admin/setup/database": [
      "./prisma/schema.prisma",
      "./scripts/prisma-provider.mjs",
      "./node_modules/prisma/**/*",
      "./node_modules/@prisma/engines/**/*",
      "./node_modules/@prisma/fetch-engine/**/*",
      "./node_modules/@prisma/get-platform/**/*",
    ],
  },
};

export default nextConfig;
