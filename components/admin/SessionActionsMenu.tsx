"use client";

import { Ban, Flag, MapPin, MapPinOff, RotateCcw, ShieldCheck } from "lucide-react";
import { ConfirmButton } from "./ConfirmButton";
import { IconButton } from "./IconButton";
import { useT } from "@/lib/i18n/context";

interface SessionActionsMenuProps {
  sessionId: string | null;
  sessionStatus: string | null;
  onChanged: () => void;
}

export function SessionActionsMenu({ sessionId, sessionStatus, onChanged }: SessionActionsMenuProps) {
  const t = useT();
  async function post(url: string) {
    await fetch(url, { method: "POST" });
    onChanged();
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {sessionId && sessionStatus !== "blocked" && (
        <ConfirmButton
          confirmMessage={t.participants.detail.actions.block}
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/block`)}
          icon={Ban}
          label={t.participants.detail.actions.block}
          variant="neutral"
        >
          {t.participants.detail.actions.block}
        </ConfirmButton>
      )}
      {sessionId && sessionStatus === "blocked" && (
        <IconButton icon={ShieldCheck} label={t.participants.detail.actions.unblock} onClick={() => post(`/api/admin/sessions/${sessionId}/unblock`)} />
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage={t.participants.detail.actions.reset}
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/reset`)}
          icon={RotateCcw}
          label={t.participants.detail.actions.reset}
          variant="neutral"
        >
          {t.participants.detail.actions.reset}
        </ConfirmButton>
      )}
      {sessionId && sessionStatus === "active" && (
        <ConfirmButton
          confirmMessage={t.participants.detail.actions.showDestination}
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/show-destination`)}
          icon={MapPin}
          label={t.participants.detail.actions.showDestination}
          variant="neutral"
        >
          {t.participants.detail.actions.showDestination}
        </ConfirmButton>
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage={t.participants.detail.actions.markArrived}
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/mark-arrived`)}
          icon={Flag}
          label={t.participants.detail.actions.markArrived}
          variant="neutral"
        >
          {t.participants.detail.actions.markArrived}
        </ConfirmButton>
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage={t.participants.detail.actions.deleteLocation}
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/delete-location`)}
          icon={MapPinOff}
          label={t.participants.detail.actions.deleteLocation}
          variant="neutral"
        >
          {t.participants.detail.actions.deleteLocation}
        </ConfirmButton>
      )}
    </div>
  );
}
