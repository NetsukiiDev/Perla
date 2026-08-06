import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth-admin";
import type { AccessLogType, Prisma } from "@/lib/generated/prisma/client";

interface WriteAccessLogInput {
  type: AccessLogType;
  eventId?: string | null;
  participantId?: string | null;
  inviteCodeId?: string | null;
  sessionId?: string | null;
  metadata?: Prisma.InputJsonValue;
  // The email this entry is "about" — the admin who performed an
  // admin_action, or the email a login/password-reset attempt named.
  // Explicit callers (login, password reset, the Telegram bot — anything
  // without a cookie session to read) pass it directly; a cookie-authenticated
  // admin_action route can omit it and it's resolved from the current
  // session below, so none of those ~20 call sites needed to be touched
  // individually.
  actorEmail?: string | null;
}

// Resolves the acting admin from the request's session cookie. Only ever
// meaningful for "admin_action" — a failed/successful login already logs
// the email it was attempted with, and participant-flow events have no
// admin actor to attribute.
async function currentAdminEmail(): Promise<string | null> {
  try {
    const session = await getAdminSession();
    if (!session) return null;
    const user = await prisma.adminUser.findUnique({ where: { id: session.userId }, select: { email: true } });
    return user?.email ?? null;
  } catch {
    return null;
  }
}

// Logging must never break the request it's attached to, so failures are
// swallowed (and reported to the server console) rather than thrown.
export async function writeAccessLog(input: WriteAccessLogInput): Promise<void> {
  try {
    const actorEmail = input.actorEmail ?? (input.type === "admin_action" ? await currentAdminEmail() : null);

    await prisma.accessLog.create({
      data: {
        type: input.type,
        eventId: input.eventId ?? null,
        participantId: input.participantId ?? null,
        inviteCodeId: input.inviteCodeId ?? null,
        sessionId: input.sessionId ?? null,
        metadataJson: input.metadata,
        actorEmail: actorEmail ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write access log", err);
  }
}
