import { prisma } from "@/lib/db";
import type { AccessLogType, Prisma } from "@/lib/generated/prisma/client";

interface WriteAccessLogInput {
  type: AccessLogType;
  eventId?: string | null;
  participantId?: string | null;
  inviteCodeId?: string | null;
  sessionId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

// Logging must never break the request it's attached to, so failures are
// swallowed (and reported to the server console) rather than thrown.
export async function writeAccessLog(input: WriteAccessLogInput): Promise<void> {
  try {
    await prisma.accessLog.create({
      data: {
        type: input.type,
        eventId: input.eventId ?? null,
        participantId: input.participantId ?? null,
        inviteCodeId: input.inviteCodeId ?? null,
        sessionId: input.sessionId ?? null,
        metadataJson: input.metadata,
      },
    });
  } catch (err) {
    console.error("Failed to write access log", err);
  }
}
