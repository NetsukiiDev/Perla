"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";

const EventLocationPicker = dynamic(() => import("./EventLocationPicker").then((m) => m.EventLocationPicker), {
  ssr: false,
  loading: () => <div className="h-80 rounded-lg border border-surface-border bg-surface" />,
});

export interface EventFormValues {
  id?: string;
  internalName: string;
  destinationLat: number;
  destinationLng: number;
  revealAt: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  stepsCount: number;
  unlockRadiusM: number;
  showTotalDistance: boolean;
  showTotalDuration: boolean;
  showTollInfo: boolean;
  notes: string | null;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Bozza" },
  { value: "scheduled", label: "Programmato" },
  { value: "active", label: "Attivo" },
  { value: "closed", label: "Chiuso" },
  { value: "archived", label: "Archiviato" },
];

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function parseDecimalInput(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function formatCoord(value: number): string {
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function EventForm({ initial }: { initial?: EventFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [internalName, setInternalName] = useState(initial?.internalName ?? "");
  const [destinationLat, setDestinationLat] = useState(initial ? String(initial.destinationLat) : "");
  const [destinationLng, setDestinationLng] = useState(initial ? String(initial.destinationLng) : "");
  const [revealAt, setRevealAt] = useState(toLocalInput(initial?.revealAt ?? null));
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [stepsCount, setStepsCount] = useState(String(initial?.stepsCount ?? 6));
  const [unlockRadiusM, setUnlockRadiusM] = useState(String(initial?.unlockRadiusM ?? 100));
  const [showTotalDistance, setShowTotalDistance] = useState(initial?.showTotalDistance ?? true);
  const [showTotalDuration, setShowTotalDuration] = useState(initial?.showTotalDuration ?? true);
  const [showTollInfo, setShowTollInfo] = useState(initial?.showTollInfo ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      internalName,
      destinationLat: parseDecimalInput(destinationLat),
      destinationLng: parseDecimalInput(destinationLng),
      revealAt: fromLocalInput(revealAt),
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
      stepsCount: Number(stepsCount),
      unlockRadiusM: Number(unlockRadiusM),
      showTotalDistance,
      showTotalDuration,
      showTollInfo,
      notes: notes || null,
      ...(isEdit ? { status } : {}),
    };

    try {
      const res = await fetch(isEdit ? `/api/admin/events/${initial?.id}` : "/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error === "region_not_detected"
            ? "Coordinate non riconosciute in una regione italiana. Controlla latitudine e longitudine."
            : "Impossibile salvare l'evento. Controlla i campi.",
        );
        return;
      }
      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError("Si è verificato un errore. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!window.confirm(`Eliminare definitivamente l'evento "${initial.internalName}"? Questa azione non può essere annullata.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Impossibile eliminare l'evento.");
        setDeleting(false);
        return;
      }
      router.push("/admin/events");
      router.refresh();
    } catch {
      setError("Si è verificato un errore. Riprova.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Nome interno</label>
          <input
            required
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Posizione evento</label>
        <EventLocationPicker
          lat={Number.isFinite(parseDecimalInput(destinationLat)) ? parseDecimalInput(destinationLat) : null}
          lng={Number.isFinite(parseDecimalInput(destinationLng)) ? parseDecimalInput(destinationLng) : null}
          onChange={(lat, lng) => {
            setDestinationLat(formatCoord(lat));
            setDestinationLng(formatCoord(lng));
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Latitudine destinazione</label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={destinationLat}
            onChange={(e) => setDestinationLat(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Longitudine destinazione</label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={destinationLng}
            onChange={(e) => setDestinationLng(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Attivazione posizioni</label>
          <input
            type="datetime-local"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Inizio evento</label>
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Fine evento</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {isEdit && (
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Stato</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Numero tappe</label>
          <input
            required
            type="number"
            min={1}
            max={50}
            value={stepsCount}
            onChange={(e) => setStepsCount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Raggio sblocco (m)</label>
          <input
            required
            type="number"
            min={5}
            max={5000}
            value={unlockRadiusM}
            onChange={(e) => setUnlockRadiusM(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTotalDistance}
            onChange={(e) => setShowTotalDistance(e.target.checked)}
          />
          Mostra distanza totale
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTotalDuration}
            onChange={(e) => setShowTotalDuration(e.target.checked)}
          />
          Mostra durata totale
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTollInfo}
            onChange={(e) => setShowTollInfo(e.target.checked)}
          />
          Mostra autostrada e pedaggio stimato
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Note interne</label>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={loading || deleting}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {isEdit ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {loading ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea evento"}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? "Eliminazione..." : "Elimina evento"}
          </button>
        )}
      </div>
    </form>
  );
}
