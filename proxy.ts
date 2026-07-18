// Runs on every request (except static assets):
// 1. Enforces HTTPS in production, but ONLY when a fronting proxy explicitly
//    reports the original request was plain HTTP (x-forwarded-proto: http).
//    We never infer from req.nextUrl.protocol — it is always "http:"
//    internally even when TLS was terminated upstream, so relying on it would
//    force HTTPS on a local `next start` (no TLS) and cause ERR_SSL errors.
//    Cloudflare Tunnel (cloudflared) is a special case: it always connects to
//    the origin over plain HTTP even when the client's original request was
//    HTTPS, which would otherwise trigger a redirect loop — cf-ray is only
//    ever present when Cloudflare is actually proxying the request, so
//    skipping the redirect on it doesn't affect other deployments.
// 2. Protects /admin/* (except /admin/login). Edge runtime: only verifies
//    the signed session cookie's signature/expiry — no DB round trip here.
//    Admin pages and route handlers re-check the current user in the DB.
import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth-admin";
import { COOKIE_NAMES } from "@/lib/constants";
import { requestOrigin, requestUrl } from "@/lib/request-url";

export async function proxy(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isBehindCloudflare = !!req.headers.get("cf-ray");
  if (process.env.NODE_ENV === "production" && forwardedProto === "http" && !isBehindCloudflare) {
    const httpsOrigin = requestOrigin(req).replace(/^http:/, "https:");
    const httpsUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, httpsOrigin);
    return NextResponse.redirect(httpsUrl, 308);
  }

  const { pathname } = req.nextUrl;
  // Unauthenticated admin pages: login/setup, plus the password-recovery
  // flow — someone who forgot their password is by definition not logged
  // in, so gating these behind a session would make them unreachable.
  const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/setup", "/admin/forgot-password", "/admin/reset-password"]);
  if (!pathname.startsWith("/admin") || PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAMES.ADMIN_SESSION)?.value;
  const session = token ? await verifyAdminSessionToken(token) : null;

  if (!session) {
    const loginUrl = requestUrl(req, "/admin/login");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
