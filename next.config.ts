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
};

export default nextConfig;
