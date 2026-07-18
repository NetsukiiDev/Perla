function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/i;

export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = firstHeaderValue(req.headers.get("host")) ?? firstHeaderValue(req.headers.get("x-forwarded-host")) ?? url.host;
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : url.protocol.replace(":", "");

  // A reverse proxy that connects to the origin over localhost (e.g.
  // cloudflared, nginx on the same box) makes the Host header "localhost:PORT"
  // — useless for building links (password-reset emails, redirects) meant
  // for the outside world. APP_URL lets self-hosted deployments declare
  // their real public origin for exactly this case.
  const hostname = host.split(":")[0];
  if (LOCAL_HOSTS.test(hostname)) {
    const envUrl = process.env.APP_URL;
    if (envUrl) {
      try {
        return new URL(envUrl).origin;
      } catch {
        // Malformed APP_URL — fall through to the header-derived origin.
      }
    }
  }

  return `${protocol || "http"}://${host}`;
}

export function requestUrl(req: Request, path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, requestOrigin(req));
}
