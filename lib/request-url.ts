function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = firstHeaderValue(req.headers.get("host")) ?? firstHeaderValue(req.headers.get("x-forwarded-host")) ?? url.host;
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : url.protocol.replace(":", "");

  return `${protocol || "http"}://${host}`;
}

export function requestUrl(req: Request, path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, requestOrigin(req));
}
