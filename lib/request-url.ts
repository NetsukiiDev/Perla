function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/i;

export function requestOrigin(req: Request): string {
  // APP_URL always wins when set: it lets self-hosted deployments behind a
  // reverse proxy (nginx, Caddy, Cloudflare Tunnel) declare their real
  // public origin regardless of what Host / X-Forwarded-Proto headers the
  // proxy forwards — those headers reflect the internal HTTP connection,
  // not the public HTTPS address.
  const envUrl = process.env.APP_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      // Malformed APP_URL — fall through to header-derived origin.
    }
  }

  const url = new URL(req.url);
  const host = firstHeaderValue(req.headers.get("host")) ?? firstHeaderValue(req.headers.get("x-forwarded-host")) ?? url.host;
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : url.protocol.replace(":", "");

  // When no APP_URL is set, localhost still needs a fallback: a reverse proxy
  // that connects to the origin over localhost (e.g. cloudflared, nginx on the
  // same box) makes the Host header "localhost:PORT" — useless for building
  // links (password-reset emails, redirects) meant for the outside world.
  const hostname = host.split(":")[0];
  if (LOCAL_HOSTS.test(hostname)) {
    console.error(
      "APP_URL is not set and the request comes from a local address — " +
        "set APP_URL to the public origin (e.g. https://perla.example.com) " +
        "so that links, webhooks, and redirects use the correct URL.",
    );
  }

  return `${protocol || "http"}://${host}`;
}

export function requestUrl(req: Request, path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, requestOrigin(req));
}
