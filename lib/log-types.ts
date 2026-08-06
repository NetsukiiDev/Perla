// Shared between the admin panel's log filters (components/admin/SiteLogSection.tsx)
// and the API route that enforces them (app/api/admin/logs/route.ts), so the two
// lists can never drift apart — the UI only ever offers a type the backend
// actually accepts.
import type { AccessLogType } from "@/lib/generated/prisma/client";

export const ADMIN_LOG_TYPES: AccessLogType[] = [
  "admin_login",
  "admin_login_failed",
  "admin_action",
  "password_reset_request",
  "password_reset_success",
];

export const EVENT_LOG_TYPES: AccessLogType[] = [
  "code_verify_success",
  "code_verify_invalid",
  "code_verify_already_used",
  "code_not_yet_available",
  "code_not_available",
  "site_opened",
  "geolocation_denied",
  "session_started",
  "location_update",
  "step_unlocked",
  "arrived",
  "routing_error",
];
