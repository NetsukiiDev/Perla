"use client";

import { useT } from "@/lib/i18n/context";

// Warning shown on event pages when the event is not active: its codes
// return "Codice non disponibile" to participants until it goes live.
export function EventInactiveNotice({ status }: { status: string }) {
  const t = useT();
  if (status === "active") return null;

  const reason =
    status === "closed" || status === "archived"
      ? t.events.inactiveNotice.closed
      : t.events.inactiveNotice.notActive;

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
      {reason}
    </div>
  );
}
