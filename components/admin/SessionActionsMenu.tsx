"use client";

import { Ban, Flag, MapPin, MapPinOff, RotateCcw, ShieldCheck } from "lucide-react";
import { ConfirmButton } from "./ConfirmButton";
import { IconButton } from "./IconButton";

interface SessionActionsMenuProps {
  sessionId: string | null;
  sessionStatus: string | null;
  onChanged: () => void;
}

export function SessionActionsMenu({ sessionId, sessionStatus, onChanged }: SessionActionsMenuProps) {
  async function post(url: string) {
    await fetch(url, { method: "POST" });
    onChanged();
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {sessionId && sessionStatus !== "blocked" && (
        <ConfirmButton
          confirmMessage="Bloccare questa sessione?"
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/block`)}
          icon={Ban}
          label="Blocca"
          variant="neutral"
        >
          Blocca
        </ConfirmButton>
      )}
      {sessionId && sessionStatus === "blocked" && (
        <IconButton icon={ShieldCheck} label="Sblocca" onClick={() => post(`/api/admin/sessions/${sessionId}/unblock`)} />
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage="Resettare il viaggio di questo codice dalla tappa 1?"
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/reset`)}
          icon={RotateCcw}
          label="Resetta viaggio"
          variant="neutral"
        >
          Resetta
        </ConfirmButton>
      )}
      {sessionId && sessionStatus === "active" && (
        <ConfirmButton
          confirmMessage="Mostrare subito la destinazione finale a questo codice?"
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/show-destination`)}
          icon={MapPin}
          label="Mostra destinazione"
          variant="neutral"
        >
          Mostra destinazione
        </ConfirmButton>
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage="Segnare questo codice come arrivato?"
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/mark-arrived`)}
          icon={Flag}
          label="Segna arrivato"
          variant="neutral"
        >
          Segna arrivato
        </ConfirmButton>
      )}
      {sessionId && (
        <ConfirmButton
          confirmMessage="Cancellare i dati di posizione di questo codice?"
          onConfirm={() => post(`/api/admin/sessions/${sessionId}/delete-location`)}
          icon={MapPinOff}
          label="Cancella posizione"
          variant="neutral"
        >
          Cancella posizione
        </ConfirmButton>
      )}
    </div>
  );
}
