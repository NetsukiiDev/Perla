"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square } from "lucide-react";
import { IconButton } from "./IconButton";
import { useT } from "@/lib/i18n/context";

// Quick status transitions from the event pages so codes can be made live
// without opening the edit form.
export function EventStatusControl({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Closed is the only state with a single way out (reopen); every other
  // state — active, or suspended (draft/scheduled/archived) — can go
  // straight to closed too, not just toggle back and forth.
  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <IconButton icon={Pause} label={t.events.statusControl.deactivate} disabled={loading} onClick={() => setStatus("draft")} />
      ) : (
        <IconButton icon={Play} label={t.events.statusControl.activate} disabled={loading} onClick={() => setStatus("active")} variant="primary" />
      )}
      {status !== "closed" && (
        <IconButton icon={Square} label={t.events.statusControl.close} disabled={loading} onClick={() => setStatus("closed")} />
      )}
    </div>
  );
}
