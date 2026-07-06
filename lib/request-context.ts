// Extracts client IP / user-agent from a Next.js Request. IP is only ever
// used as a soft risk signal (see lib/hash.ts callers) — never as a hard
// access-control check, since mobile IPs roam.
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const forwarded = req.headers.get("forwarded");
  const forwardedForMatch = forwarded?.match(/for="?([^";,]+)"?/i);
  if (forwardedForMatch?.[1]) return forwardedForMatch[1].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const clientIp = req.headers.get("x-client-ip");
  if (clientIp) return clientIp.trim();

  return "unknown";
}

export function getUserAgent(req: Request): string {
  return req.headers.get("user-agent") ?? "unknown";
}
