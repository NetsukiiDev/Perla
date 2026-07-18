import { NextResponse } from "next/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession, type AdminSessionData } from "@/lib/auth-admin";
import type { AdminRole, AdminUser, Event } from "@/lib/generated/prisma/client";

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

// Shared by both event-ownership guards below. Admins can access any event;
// an organizer only their own. `createdById` is null for events created
// before this field existed — those are admin-only until reassigned.
export function assertOwnsEvent(
  session: { userId: string; role: AdminRole },
  event: { createdById: string | null },
): boolean {
  return session.role === "admin" || event.createdById === session.userId;
}

// API-route guard for any endpoint scoped to a single event. Always 404s
// (never 403) on a mismatch, so an organizer probing another org's event ID
// can't distinguish "doesn't exist" from "exists but isn't yours".
export async function requireEventAccess(
  eventId: string,
): Promise<{ session: AdminSessionData; event: Event } | { response: NextResponse }> {
  const auth = await requireAdmin();
  if ("response" in auth) return auth;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !assertOwnsEvent(auth.session, event)) {
    return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  return { session: auth.session, event };
}

// Page-level equivalent, for app/admin/events/[id]/layout.tsx: redirects to
// login if unauthenticated, notFound() on a missing/unowned event.
export async function requireEventAccessPage(eventId: string): Promise<{ user: AdminUser; event: Event }> {
  const user = await requireAdminPage();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !assertOwnsEvent({ userId: user.id, role: user.role }, event)) {
    notFound();
  }
  return { user, event };
}
