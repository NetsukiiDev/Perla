// Unified display-status vocabulary for the admin dashboard, derived from
// participant + invite code + session state rather than stored directly —
// see prisma/schema.prisma comments for why these stay separate enums.
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

export const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  not_started: "Non partito",
  opened_site: "Ha aperto il sito",
  started: "Partito",
  in_progress: "In viaggio",
  arrived: "Arrivato",
  blocked: "Bloccato",
  expired: "Scaduto",
};

export const INVITE_CODE_STATUS_LABELS: Record<string, string> = {
  created: "Creato",
  valid: "Attivo",
  scheduled: "Programmato",
  started: "Partito",
  in_progress: "In viaggio",
  arrived: "Arrivato",
  expired: "Scaduto",
  revoked: "Disattivato",
  blocked: "Bloccato",
  deleted: "Eliminato",
};

export function inviteCodeStatusLabel(status: string | null): string {
  if (!status) return "N/D";
  return INVITE_CODE_STATUS_LABELS[status] ?? status;
}
