import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession, type AdminSessionData } from "@/lib/auth-admin";
import type { AdminRole, AdminUser } from "@/lib/generated/prisma/client";

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const session = await getAdminSession();
  if (!session) return null;
  try {
    return await prisma.adminUser.findUnique({ where: { id: session.userId } });
  } catch {
    // DB not ready yet (setup page before schema exists) — treat as unauthenticated.
    return null;
  }
}

// Authoritative admin check for API routes. This intentionally does a DB
// lookup so deleted/demoted accounts cannot keep using a still-valid cookie.
export async function requireAdmin(): Promise<{ session: AdminSessionData } | { response: NextResponse }> {
  const user = await getCurrentAdminUser();
  if (!user) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session: { userId: user.id, role: user.role } };
}

// Authoritative check: loads the current AdminUser from the DB and (optionally)
// enforces a role. Use this for privileged actions (user management) so a
// stale cookie for a deleted/demoted account can't be used.
export async function requireAdminUser(
  allowedRoles?: AdminRole[],
): Promise<{ user: AdminUser } | { response: NextResponse }> {
  const session = await getAdminSession();
  if (!session) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.adminUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function requireAdminPage(allowedRoles?: AdminRole[]): Promise<AdminUser> {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/admin/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/admin/events");
  return user;
}
