// POST /api/admin/account/password — change your OWN password (any role).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { changePasswordSchema } from "@/lib/validation/admin-users";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "wrong_password" }, { status: 403 });
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await writeAccessLog({ type: AccessLogType.admin_action, metadata: { action: "change_password", userId: user.id } });
  return NextResponse.json({ ok: true });
}
