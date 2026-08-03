// Manages Cloudflare Tunnels for local dev use — same purpose as
// lib/ngrok-tunnel.ts (let an admin/organizer test the participant flow's
// geolocation, or register the Telegram webhook, from a real HTTPS URL
// instead of just localhost), offered as a second provider for whoever's
// network blocks ngrok specifically (some antivirus/corporate TLS-inspection
// setups interfere with its bundled client — cloudflared is a different
// binary and protocol, unaffected by the same block).
//
// Uses the `cloudflared` npm package (github.com/JacobLinCool/node-cloudflared),
// which downloads and manages the official cloudflared binary itself — same
// shape as @ngrok/ngrok bundling its own native binary, so this needs no
// separate system-wide install. The binary is fetched once, on first tunnel
// start, from Cloudflare's own GitHub releases; every start after that
// reuses the cached copy.
//
// Two modes:
//   - No token saved: an anonymous Quick Tunnel (Tunnel.quick), no Cloudflare
//     account needed, but a new random *.trycloudflare.com hostname every
//     time it starts.
//   - Token saved (from a named tunnel created in the Cloudflare Zero Trust
//     dashboard, already pointed at this machine's port there): Tunnel.withToken,
//     giving a stable hostname. The ingress mapping lives in Cloudflare's
//     config, not on this command line, so `port` is only used for Quick
//     Tunnels.
//
// The running-tunnels map is cached on globalThis, not a plain module-level
// const — same reason lib/db.ts caches the Prisma client there: `next dev`
// (Turbopack) can re-evaluate a route's module graph between requests, which
// would silently reset a plain module-scope Map. Without this, a tunnel
// started by one request looked instantly dead to the very next status
// check, even though the underlying cloudflared process was still healthy.
import fs from "node:fs";
import { Tunnel, bin, install } from "cloudflared";

interface RunningTunnel {
  tunnel: Tunnel;
  url: string | null;
}

const globalForTunnels = globalThis as unknown as { cloudflareTunnels?: Map<string, RunningTunnel> };
const tunnels = globalForTunnels.cloudflareTunnels ?? new Map<string, RunningTunnel>();
globalForTunnels.cloudflareTunnels = tunnels;

export function getTunnelStatus(userId: string): { running: boolean; url: string | null } {
  const running = tunnels.get(userId);
  return { running: running !== undefined, url: running?.url ?? null };
}

const READY_TIMEOUT_MS = 20_000;

export async function startTunnel(
  userId: string,
  options: { tunnelToken?: string | null; hostname?: string | null; port?: number },
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const existing = tunnels.get(userId);
  if (existing) return { ok: true, url: existing.url };

  // Downloaded once and cached at `bin` — deliberately outside the
  // readiness timeout below, since a slow download shouldn't read as a
  // stalled tunnel connection.
  if (!fs.existsSync(bin)) {
    try {
      await install(bin);
    } catch (err) {
      console.error("cloudflared download failed:", err instanceof Error ? err.message : err);
      return { ok: false, error: "not_installed" };
    }
  }

  const usingToken = Boolean(options.tunnelToken);
  const tunnel = usingToken ? Tunnel.withToken(options.tunnelToken!) : Tunnel.quick(`http://localhost:${options.port ?? 3000}`);

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      tunnel.stop();
      resolve({ ok: false, error: "timeout" });
    }, READY_TIMEOUT_MS);

    const succeed = (url: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      tunnels.set(userId, { tunnel, url });
      resolve({ ok: true, url });
    };

    if (usingToken) {
      // Named tunnels have no printed URL — the hostname is whatever was
      // configured on Cloudflare's side, purely informational here.
      tunnel.once("connected", () => succeed(options.hostname ? `https://${options.hostname}` : null));
    } else {
      tunnel.once("url", (url) => succeed(url));
    }

    tunnel.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    tunnel.once("exit", (code) => {
      tunnels.delete(userId);
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: `cloudflared exited early (code ${code})` });
    });
  });
}

export async function stopTunnel(userId: string): Promise<void> {
  const running = tunnels.get(userId);
  if (!running) return;
  tunnels.delete(userId);
  running.tunnel.stop();
}
