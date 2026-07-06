"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ConfirmButton } from "./ConfirmButton";
import { iconButtonClass } from "./IconButton";

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  scheduled: "Programmato",
  active: "Attivo",
  closed: "Chiuso",
  archived: "Archiviato",
};

interface EventRow {
  id: string;
  internalName: string;
  region: string;
  status: string;
  startsAt: string;
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted">Nessun evento creato.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Nome interno</th>
            <th className="px-4 py-3">Regione</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3">Inizio</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-surface-border last:border-0">
              <td className="px-4 py-3">
                <Link href={`/admin/events/${event.id}`} className="hover:underline">
                  {event.internalName}
                </Link>
              </td>
              <td className="px-4 py-3">{event.region}</td>
              <td className="px-4 py-3">
                <StatusBadge value={event.status} label={STATUS_LABELS[event.status] ?? event.status} />
              </td>
              <td className="px-4 py-3 text-muted">{new Date(event.startsAt).toLocaleString("it-IT")}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/events/${event.id}/live`}
                    title="Live"
                    aria-label="Live"
                    className={iconButtonClass()}
                  >
                    <Activity size={16} aria-hidden="true" />
                    <span className="sr-only">Live</span>
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    title="Modifica"
                    aria-label="Modifica"
                    className={iconButtonClass()}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    <span className="sr-only">Modifica</span>
                  </Link>
                  <ConfirmButton
                    confirmMessage={`Eliminare definitivamente l'evento "${event.internalName}"? Questa azione non può essere annullata.`}
                    onConfirm={() => handleDelete(event.id)}
                    icon={Trash2}
                    label="Elimina"
                  >
                    Elimina
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
