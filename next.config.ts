import type { NextConfig } from "next";

// Set by scripts/dev-tunnel.mjs once the ngrok public URL is known, so the
// dev server accepts cross-origin requests (HMR, RSC, server actions) coming
// back through the tunnel instead of rejecting them as an unrecognized origin.
const tunnelHost = process.env.TUNNEL_HOST ? [process.env.TUNNEL_HOST] : [];

const nextConfig: NextConfig = {
  // "*.trycloudflare.com" covers Cloudflare Quick Tunnels (lib/cloudflare-tunnel.ts):
  // unlike the ngrok flow above, that tunnel is started from inside the already-running
  // dev server via the admin panel, with a hostname assigned at random by Cloudflare on
  // each start — there's no moment before `next dev` boots to learn a specific hostname
  // and inject it the way TUNNEL_HOST does. Without this, the tunnel's initial HTML load
  // succeeds but every /_next asset request gets rejected as cross-origin, so the page
  // never hydrates (stays blank/stuck loading). Named tunnels with a fixed hostname
  // (saved token + hostname in Settings) aren't covered by this wildcard — add that
  // hostname here too if you hit the same issue with one.
  allowedDevOrigins: [
    "10.0.0.100",
    "100.67.143.53",
    "windows11-netsukii.note-alphard.ts.net",
    "*.trycloudflare.com",
    ...tunnelHost,
  ],
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
