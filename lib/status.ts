import type { Dictionary } from "@/lib/i18n/types";
import type { SessionStatus } from "@/lib/generated/prisma/client";

export type DisplayStatus = "not_started" | "opened_site" | "started" | "in_progress" | "arrived" | "blocked" | "expired";

export function deriveDisplayStatus(params: {
  hasOpenedSite: boolean;
  session: { status: SessionStatus; currentStep: number } | null;
}): DisplayStatus {
  const { hasOpenedSite, session } = params;
  if (!session) {
    return hasOpenedSite ? "opened_site" : "not_started";
  }
  switch (session.status) {
    case "blocked":
      return "blocked";
    case "completed":
      return "arrived";
    case "expired":
      return "expired";
    case "active":
    default:
      return session.currentStep > 1 ? "in_progress" : "started";
  }
}

export function getDisplayStatusLabels(t: Dictionary): Record<DisplayStatus, string> {
  return {
    not_started: t.status.display.not_started,
    opened_site: t.status.display.opened_site,
    started: t.status.display.started,
    in_progress: t.status.display.in_progress,
    arrived: t.status.display.arrived,
    blocked: t.status.display.blocked,
    expired: t.status.display.expired,
  };
}

export function getInviteCodeStatusLabels(t: Dictionary): Record<string, string> {
  return {
    created: t.status.inviteCode.created,
    valid: t.status.inviteCode.valid,
    scheduled: t.status.inviteCode.scheduled,
    started: t.status.inviteCode.started,
    in_progress: t.status.inviteCode.in_progress,
    arrived: t.status.inviteCode.arrived,
    expired: t.status.inviteCode.expired,
    revoked: t.status.inviteCode.revoked,
    blocked: t.status.inviteCode.blocked,
    deleted: t.status.inviteCode.deleted,
  };
}

export function inviteCodeStatusLabel(status: string | null, t: Dictionary): string {
  if (!status) return t.status.inviteCode.na;
  const labels = getInviteCodeStatusLabels(t);
  return labels[status] ?? status;
}
