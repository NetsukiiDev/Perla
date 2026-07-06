// In-memory fixed-window rate limiter.
//
// This only works correctly within a single warm serverless instance —
// counts reset on cold start and are not shared across instances. A
// multi-instance/serverless production deployment should swap this module
// for a shared store (e.g. Upstash Redis) behind the same function
// signature; every call site only depends on `rateLimit()`'s shape below.
interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= opts.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: opts.max - 1, resetAt: now + opts.windowMs };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.windowStart + opts.windowMs };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.max - existing.count,
    resetAt: existing.windowStart + opts.windowMs,
  };
}

export function rateLimitKey(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}
