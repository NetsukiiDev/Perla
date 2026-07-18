"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";

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
  createdById: string | null;
}

export interface EventFormOwner {
  id: string;
  email: string;
  role: "admin" | "organizer";
}

const STATUS_OPTIONS = ["draft", "scheduled", "active", "closed", "archived"] as const;

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

export function EventForm({
  initial,
  canReassignOwner = false,
  owners = [],
}: {
  initial?: EventFormValues;
  canReassignOwner?: boolean;
  owners?: EventFormOwner[];
}) {
  const router = useRouter();
  const t = useT();
  const isEdit = Boolean(initial?.id);

  const [internalName, setInternalName] = useState(initial?.internalName ?? "");
  const [createdById, setCreatedById] = useState(initial?.createdById ?? "");
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
      ...(isEdit && canReassignOwner ? { createdById: createdById || null } : {}),
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
            ? t.events.form.errors.coordinate
            : t.events.form.errors.saveFailed,
        );
        return;
      }
      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError(t.events.form.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!window.confirm(t.events.form.confirmDelete.replace("{name}", initial.internalName))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t.events.form.errors.deleteFailed);
        setDeleting(false);
        return;
      }
      router.push("/admin/events");
      router.refresh();
    } catch {
      setError(t.events.form.errors.generic);
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.events.form.labels.internalName}</label>
          <input
            required
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>{t.events.form.labels.location}</label>
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
          <label className={labelClass}>{t.events.form.labels.destLat}</label>
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
          <label className={labelClass}>{t.events.form.labels.destLng}</label>
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
          <label className={labelClass}>{t.events.form.labels.activationTime}</label>
          <input
            type="datetime-local"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.events.form.labels.startTime}</label>
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.events.form.labels.endTime}</label>
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
            <label className={labelClass}>{t.events.form.labels.status}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t.events.statusOptions[opt]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.events.form.labels.steps}</label>
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
          <label className={labelClass}>{t.events.form.labels.unlockRadius}</label>
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

      {isEdit && canReassignOwner && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{t.events.form.labels.owner}</label>
            <select value={createdById} onChange={(e) => setCreatedById(e.target.value)} className={inputClass}>
              <option value="">{t.events.form.ownerUnassigned}</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTotalDistance}
            onChange={(e) => setShowTotalDistance(e.target.checked)}
          />
          {t.events.form.labels.showTotalDistance}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTotalDuration}
            onChange={(e) => setShowTotalDuration(e.target.checked)}
          />
          {t.events.form.labels.showTotalDuration}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTollInfo}
            onChange={(e) => setShowTollInfo(e.target.checked)}
          />
          {t.events.form.labels.showTollInfo}
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.events.form.labels.notes}</label>
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
          {loading ? t.events.form.buttons.saving : isEdit ? t.events.form.buttons.save : t.events.form.buttons.create}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? t.events.form.buttons.deleting : t.events.form.buttons.delete}
          </button>
        )}
      </div>
    </form>
  );
}
