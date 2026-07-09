// Admin user management — restricted to role "admin".
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { createUserSchema } from "@/lib/validation/admin-users";
import { hashPassword } from "@/lib/hash";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users, currentUserId: auth.user.id });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = createUserSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const user = await prisma.adminUser.create({
    data: {
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  await writeAccessLog({
    type: AccessLogType.admin_action,
    metadata: { action: "create_admin_user", by: auth.user.id, created: user.id, role: user.role },
  });
  return NextResponse.json({ user }, { status: 201 });
}
