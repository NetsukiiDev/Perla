import type { NextConfig } from "next";

// Set by scripts/dev-tunnel.mjs once the ngrok public URL is known, so the
// dev server accepts cross-origin requests (HMR, RSC, server actions) coming
// back through the tunnel instead of rejecting them as an unrecognized origin.
const tunnelHost = process.env.TUNNEL_HOST ? [process.env.TUNNEL_HOST] : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.100", "100.67.143.53", "windows11-netsukii.note-alphard.ts.net", ...tunnelHost],
  // Keep native/platform-specific packages out of the bundle — they must run
  // as real Node modules on the server (both pg and mariadb are supported).
  // @ngrok/ngrok ships a platform-specific native binary (e.g.
  // @ngrok/ngrok-win32-x64-msvc) that Turbopack can't resolve when bundled.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "@prisma/adapter-mariadb",
    "pg",
    "mariadb",
    "mongodb",
    "@ngrok/ngrok",
  ],
};

export default nextConfig;
