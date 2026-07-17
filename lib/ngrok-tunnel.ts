// Manages a single ngrok tunnel for local dev use, so an admin can test the
// participant flow's geolocation (which requires a secure context) from a
// real phone instead of just localhost. Dev-only — callers (the
// /api/admin/settings/ngrok/* routes) gate this on isVercel()/NODE_ENV before
// calling startTunnel(), since tunneling an already-public production
// deployment makes no sense.
//
// Uses the @ngrok/ngrok SDK (bundled native binary, no separate system-wide
// ngrok CLI install required) rather than spawning an external process.
//
// State lives in this module's closure, not the database — it describes the
// current listener, not persisted configuration (that's NgrokConfig).
import * as ngrok from "@ngrok/ngrok";

let listener: ngrok.Listener | null = null;

export function getTunnelStatus(): { running: boolean; url: string | null } {
  return { running: listener !== null, url: listener?.url() ?? null };
}

export async function startTunnel(options: {
  authtoken: string;
  domain?: string | null;
  port?: number;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (listener) return { ok: true, url: listener.url() ?? "" };

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
    listener = newListener;
    return { ok: true, url: newListener.url() ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function stopTunnel(): Promise<void> {
  if (!listener) return;
  const current = listener;
  listener = null;
  await current.close();
}
