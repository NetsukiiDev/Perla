"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, Power, PowerOff } from "lucide-react";
import { IconButton } from "./IconButton";

// Quick status transitions from the event pages so codes can be made live
// without opening the edit form.
export function EventStatusControl({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
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

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && (
        <IconButton icon={Power} label="Attiva evento" disabled={loading} onClick={() => setStatus("active")} variant="primary" />
      )}
      {status === "active" && (
        <>
          <IconButton icon={PowerOff} label="Disattiva evento" disabled={loading} onClick={() => setStatus("draft")} />
          <IconButton icon={CircleStop} label="Chiudi evento" disabled={loading} onClick={() => setStatus("closed")} />
        </>
      )}
    </div>
  );
}
