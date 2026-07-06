// Admin authentication: signed-cookie sessions (jose/HS256), bcrypt
// passwords. Deliberately not NextAuth — this is small enough to own
// directly and stays Edge-compatible so proxy.ts can verify the cookie
// without a DB round trip. Admin API/pages still re-check the DB via
// lib/admin-guard.ts. AdminUser.totpSecret/totpEnabled exist in
// the schema for future 2FA; no TOTP verification happens yet.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/constants";
import type { AdminRole } from "@/lib/generated/prisma/client";

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface AdminSessionData {
  userId: string;
  role: AdminRole;
}

export async function issueAdminSession(user: { id: string; role: AdminRole }): Promise<void> {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.ADMIN_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.ADMIN_SESSION);
}

// Edge-compatible: only verifies the JWT signature/expiry. Callers that
// need up-to-date role/DB state (e.g. a revoked admin) must re-check
// against the database — proxy.ts intentionally does not do that
// since Prisma isn't usable on the Edge runtime here.
export async function verifyAdminSessionToken(token: string): Promise<AdminSessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role as AdminRole };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.ADMIN_SESSION)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function hasAdminRole(session: AdminSessionData | null, allowed: AdminRole[]): boolean {
  if (!session) return false;
  return allowed.includes(session.role);
}
