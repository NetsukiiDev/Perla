// Runs on every request (except static assets):
// 1. Enforces HTTPS in production, but ONLY when a fronting proxy explicitly
//    reports the original request was plain HTTP (x-forwarded-proto: http).
//    We never infer from req.nextUrl.protocol — it is always "http:"
//    internally even when TLS was terminated upstream, so relying on it would
//    force HTTPS on a local `next start` (no TLS) and cause ERR_SSL errors.
// 2. Protects /admin/* (except /admin/login). Edge runtime: only verifies
//    the signed session cookie's signature/expiry — no DB round trip here.
//    Admin pages and route handlers re-check the current user in the DB.
import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth-admin";
import { COOKIE_NAMES } from "@/lib/constants";
import { requestUrl } from "@/lib/request-url";

export async function proxy(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (process.env.NODE_ENV === "production" && forwardedProto === "http") {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

  const { pathname } = req.nextUrl;
  // /admin/login and /admin/setup are the only unauthenticated admin pages.
  if (!pathname.startsWith("/admin") || pathname === "/admin/login" || pathname === "/admin/setup") {
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
