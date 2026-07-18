// Manages ngrok tunnels for local dev use, so an admin/organizer can test the
// participant flow's geolocation (which requires a secure context) from a
// real phone instead of just localhost. Dev-only — callers (the
// /api/admin/account/ngrok/* routes) gate this on isVercel()/NODE_ENV before
// calling startTunnel(), since tunneling an already-public production
// deployment makes no sense.
//
// Uses the @ngrok/ngrok SDK (bundled native binary, no separate system-wide
// ngrok CLI install required) rather than spawning an external process.
//
// Per-user: each admin/organizer has their own ngrok account/authtoken and
// can run their own tunnel independently, all forwarding to the same local
// server — keyed by adminUserId. State lives in this module's closure, not
// the database — it describes the current listeners, not persisted
// configuration (that's NgrokConfig).
import * as ngrok from "@ngrok/ngrok";

const listeners = new Map<string, ngrok.Listener>();

export function getTunnelStatus(userId: string): { running: boolean; url: string | null } {
  const listener = listeners.get(userId);
  return { running: listener !== undefined, url: listener?.url() ?? null };
}

export async function startTunnel(
  userId: string,
  options: { authtoken: string; domain?: string | null; port?: number },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const existing = listeners.get(userId);
  if (existing) return { ok: true, url: existing.url() ?? "" };

  try {
    const newListener = await ngrok.forward({
      addr: options.port ?? 3000,
      authtoken: options.authtoken,
      domain: options.domain || undefined,
      // Machine-specific escape hatch: some antivirus/corporate setups
      // (e.g. Norton's HTTPS scanning) intercept TLS with their own CA,
      // which ngrok's bundled trust store won't recognize. Unset by
      // default; set NGROK_ROOT_CAS=host (or a PEM path) per-machine.
      root_cas: process.env.NGROK_ROOT_CAS || undefined,
    });
    listeners.set(userId, newListener);
    return { ok: true, url: newListener.url() ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function stopTunnel(userId: string): Promise<void> {
  const listener = listeners.get(userId);
  if (!listener) return;
  listeners.delete(userId);
  await listener.close();
}
