// Update / delete an admin user — restricted to role "admin".
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { updateUserSchema } from "@/lib/validation/admin-users";
import { hashPassword } from "@/lib/hash";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

async function adminCount(): Promise<number> {
  return prisma.adminUser.count({ where: { role: "admin" } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Never allow demoting the last remaining admin (would lock out user mgmt).
  if (parsed.data.role === "staff" && target.role === "admin" && (await adminCount()) <= 1) {
    return NextResponse.json({ error: "last_admin" }, { status: 409 });
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: {
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.newPassword !== undefined ? { passwordHash: await hashPassword(parsed.data.newPassword) } : {}),
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  await writeAccessLog({
    type: AccessLogType.admin_action,
    metadata: { action: "update_admin_user", by: auth.user.id, target: id, role: parsed.data.role },
  });
  return NextResponse.json({ user });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 409 });
  }

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (target.role === "admin" && (await adminCount()) <= 1) {
    return NextResponse.json({ error: "last_admin" }, { status: 409 });
  }

  await prisma.adminUser.delete({ where: { id } });
  await writeAccessLog({
    type: AccessLogType.admin_action,
    metadata: { action: "delete_admin_user", by: auth.user.id, target: id },
  });
  return NextResponse.json({ ok: true });
}
