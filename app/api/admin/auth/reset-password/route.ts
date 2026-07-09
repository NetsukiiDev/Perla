// POST /api/admin/auth/reset-password (public) — set a new password using a
// valid (unused, unexpired) reset token.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/admin-auth";
import { sha256Hex, hashPassword } from "@/lib/hash";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return NextResponse.json({ error: "not_match" }, { status: 400 });
  }

  const tokenHash = sha256Hex(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } }).catch(() => null);

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: record.adminUserId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAccessLog({
    type: AccessLogType.password_reset_success,
    metadata: { userId: record.adminUserId },
  });

  return NextResponse.json({ ok: true });
}
