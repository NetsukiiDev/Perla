import type { Dictionary } from "@/lib/i18n/types";
import { timeZoneForRegion } from "@/lib/region-timezone";

export function getErrorMessages(t: Dictionary) {
  return {
    INVALID_CODE: t.participantFlow.errors.invalidCode,
    CODE_NOT_AVAILABLE: t.participantFlow.errors.codeNotAvailable,
    ALREADY_USED: t.participantFlow.errors.alreadyUsed,
    LOCATION_DENIED: t.participantFlow.errors.locationDenied,
    ROUTE_COMPLETE: t.participantFlow.errors.routeComplete,
    GENERIC: t.participantFlow.errors.generic,
  } as const;
}

export function getPrivacyNotice(t: Dictionary): string {
  return t.participantFlow.privacyNotice;
}

export function getStepHint(t: Dictionary): string {
  return t.participantFlow.stepHint;
}

export const COOKIE_NAMES = {
  CODE_REF: "code_ref",
  PARTICIPANT_SESSION: "participant_session",
  DEVICE_TOKEN: "device_token",
  ADMIN_SESSION: "admin_session",
} as const;

export const DEFAULTS = {
  STEPS_COUNT: 6,
  UNLOCK_RADIUS_M: 100,
  MAX_SESSIONS: 1,
  LOCATION_RETENTION_HOURS: 24,
  CODE_REF_TTL_MIN: 10,
} as const;

export function formatHHmm(date: Date, region?: string | null): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZoneForRegion(region),
  }).format(date);
}

// Compares calendar days in the given timezone (not just the raw Date), so a
// reveal time on a different UTC day but the same local day still counts as
// "today" — and vice versa near midnight.
function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(a) === fmt.format(b);
}

// Time-only ("18:00") reads as "later today" — misleading once the reveal
// is on a different day, since it gives no clue it's not today. Falls back
// to date+time ("07/08, 18:00") whenever the target day isn't today.
export function notYetAvailableMessage(t: Dictionary, revealAt: Date, region?: string | null): string {
  const timeZone = timeZoneForRegion(region);
  const formatted = isSameLocalDay(revealAt, new Date(), timeZone)
    ? formatHHmm(revealAt, region)
    : new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone }).format(revealAt);
  return t.participantFlow.notYetAvailable.replace("{time}", formatted);
}
