/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, ExternalLink, Link2, QrCode, RotateCcw, Trash2, UserPlus, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { CopyButton } from "./CopyButton";
import { iconButtonClass } from "./IconButton";
import { BulkQrGenerator, type QrSheetEntry } from "./BulkQrGenerator";
import { codeAccessPath } from "@/lib/code-access-link";
import { DISPLAY_STATUS_LABELS, type DisplayStatus } from "@/lib/status";

export interface ParticipantRow {
  id: string;
  displayName: string | null;
  code: string | null;
  codeId: string | null;
  codeStatus: string | null;
  displayStatus: DisplayStatus;
  currentStep: number | null;
  stepsCount: number;
  lastLocation: { lat: number; lng: number } | null;
}

const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";

export function ParticipantsManager({
  eventId,
  event,
  initialBaseUrl,
  initialParticipants,
}: {
  eventId: string;
  event: {
    internalName: string;
    region: string;
    startsAt: string;
    endsAt: string | null;
  };
  initialBaseUrl: string;
  initialParticipants: ParticipantRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<{ name: string; code: string } | null>(null);
  const [qrPreview, setQrPreview] = useState<{ code: string; displayName: string | null } | null>(null);

  const filtered = initialParticipants.filter((r) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      (r.displayName ?? "").toLowerCase().includes(normalizedSearch) ||
      (r.code ?? "").toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || r.displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const validCodeIds = new Set(initialParticipants.map((p) => p.codeId).filter(Boolean));
  const activeSelectedCodeIds = selectedCodeIds.filter((id) => validCodeIds.has(id));
  const selectedSet = new Set(activeSelectedCodeIds);
  const visibleCodeIds = filtered.flatMap((r) => (r.codeId ? [r.codeId] : []));
  const allVisibleSelected = visibleCodeIds.length > 0 && visibleCodeIds.every((id) => selectedSet.has(id));
  const selectedEntries: QrSheetEntry[] = initialParticipants
    .filter((r) => r.codeId && r.code && selectedSet.has(r.codeId))
    .map((r) => ({
      id: r.id,
      codeId: r.codeId!,
      code: r.code!,
      displayName: r.displayName,
    }));

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, displayName: name || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setName("");
        setRevealed({ name: data.participant.displayName ?? "", code: data.code });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(codeId: string, participantName: string) {
    const res = await fetch(`/api/admin/codes/${codeId}/regenerate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setRevealed({ name: participantName === "codice" ? "" : participantName, code: data.code });
      router.refresh();
    }
  }

  function accessUrlFor(code: string): string {
    return `${initialBaseUrl.replace(/\/$/, "")}${codeAccessPath(code)}`;
  }

  function toggleCode(codeId: string, checked: boolean) {
    setSelectedCodeIds((current) => {
      if (checked) return Array.from(new Set([...current, codeId]));
      return current.filter((id) => id !== codeId);
    });
  }

  function toggleVisibleCodes(checked: boolean) {
    setSelectedCodeIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleCodeIds]));
      return current.filter((id) => !visibleCodeIds.includes(id));
    });
  }

  async function deleteCodes(codeIds: string[]) {
    if (codeIds.length === 0) return;
    const ok = window.confirm(
      codeIds.length === 1
        ? "Eliminare questo codice? Verrà rimosso anche dalla lista partecipanti."
        : `Eliminare ${codeIds.length} codici selezionati? Verranno rimossi anche dalla lista partecipanti.`,
    );
    if (!ok) return;

    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/codes/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, codeIds }),
      });
      if (!res.ok) {
        setBulkError("Non sono riuscito a eliminare i codici selezionati.");
        return;
      }
      setSelectedCodeIds((current) => current.filter((id) => !codeIds.includes(id)));
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }

  function handleBulkCreated(entries: QrSheetEntry[]) {
    setSelectedCodeIds(entries.map((entry) => entry.codeId));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">Username (opzionale)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="es. mario" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <UserPlus size={16} aria-hidden="true" />
          Genera
        </button>
      </form>

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              {revealed.name ? `Codice generato per ${revealed.name}` : "Codice generato"}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl tracking-widest">{revealed.code}</span>
              <CopyButton value={revealed.code} />
              <button
                type="button"
                title="Mostra QR"
                aria-label="Mostra QR"
                onClick={() => setQrPreview({ code: revealed.code, displayName: revealed.name || null })}
                className={iconButtonClass()}
              >
                <QrCode size={16} aria-hidden="true" />
                <span className="sr-only">Mostra QR</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            title="Nascondi codice"
            aria-label="Nascondi codice"
            onClick={() => setRevealed(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">Nascondi codice</span>
          </button>
        </div>
      )}

      <BulkQrGenerator
        eventId={eventId}
        event={event}
        initialBaseUrl={initialBaseUrl}
        selectedEntries={selectedEntries}
        onCreated={handleBulkCreated}
      />

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Cerca per codice o username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">Tutti gli stati</option>
          {Object.entries(DISPLAY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {activeSelectedCodeIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckSquare size={16} aria-hidden="true" />
            {activeSelectedCodeIds.length} codici selezionati
          </p>
          <button
            type="button"
            onClick={() => void deleteCodes(activeSelectedCodeIds)}
            disabled={bulkLoading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 text-sm text-danger hover:border-danger disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            Elimina selezionati
          </button>
        </div>
      )}
      {bulkError && <p className="text-sm text-danger">{bulkError}</p>}

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={visibleCodeIds.length === 0}
                  onChange={(e) => toggleVisibleCodes(e.target.checked)}
                  aria-label="Seleziona codici visibili"
                  className="h-4 w-4 rounded border-surface-border bg-background"
                />
              </th>
              <th className="px-4 py-3">Codice</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Tappa</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(r.codeId && selectedSet.has(r.codeId))}
                    disabled={!r.codeId}
                    onChange={(e) => r.codeId && toggleCode(r.codeId, e.target.checked)}
                    aria-label={r.code ? `Seleziona codice ${r.code}` : "Codice non selezionabile"}
                    className="h-4 w-4 rounded border-surface-border bg-background"
                  />
                </td>
                <td className="px-4 py-3">
                  {r.code ? (
                    <span className="flex items-center gap-2">
                      <Link href={`/admin/events/${eventId}/participants/${r.id}`} className="font-mono tracking-widest hover:underline">
                        {r.code}
                      </Link>
                      <CopyButton value={r.code} />
                      <button
                        type="button"
                        title="Mostra QR"
                        aria-label="Mostra QR"
                        onClick={() => setQrPreview({ code: r.code!, displayName: r.displayName })}
                        className={iconButtonClass()}
                      >
                        <QrCode size={16} aria-hidden="true" />
                        <span className="sr-only">Mostra QR</span>
                      </button>
                      <a
                        href={codeAccessPath(r.code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={iconButtonClass()}
                        title="Apri link accesso"
                        aria-label="Apri link accesso"
                      >
                        <Link2 size={16} aria-hidden="true" />
                        <span className="sr-only">Apri link accesso</span>
                      </a>
                    </span>
                  ) : (
                    <span className="text-muted">N/D</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{r.displayName ?? "N/D"}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={r.displayStatus} label={DISPLAY_STATUS_LABELS[r.displayStatus]} />
                </td>
                <td className="px-4 py-3 text-muted">{r.currentStep ? `${r.currentStep}/${r.stepsCount}` : "N/D"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {r.codeId && (
                      <button
                        type="button"
                        title="Rigenera codice"
                        aria-label="Rigenera codice"
                        onClick={() => regenerate(r.codeId!, r.displayName ?? "codice")}
                        className={iconButtonClass()}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        <span className="sr-only">Rigenera codice</span>
                      </button>
                    )}
                    <Link
                      href={`/admin/events/${eventId}/participants/${r.id}`}
                      title="Apri partecipante"
                      aria-label="Apri partecipante"
                      className={iconButtonClass()}
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                      <span className="sr-only">Apri partecipante</span>
                    </Link>
                    {r.codeId && (
                      <button
                        type="button"
                        title="Elimina codice"
                        aria-label="Elimina codice"
                        onClick={() => void deleteCodes([r.codeId!])}
                        disabled={bulkLoading}
                        className={iconButtonClass("danger")}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span className="sr-only">Elimina codice</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nessun codice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qrPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">QR accesso</p>
                <h2 className="mt-1 font-mono text-xl tracking-widest">{qrPreview.code}</h2>
                {qrPreview.displayName && <p className="text-sm text-muted">{qrPreview.displayName}</p>}
              </div>
              <button
                type="button"
                title="Chiudi"
                aria-label="Chiudi"
                onClick={() => setQrPreview(null)}
                className={iconButtonClass()}
              >
                <X size={16} aria-hidden="true" />
                <span className="sr-only">Chiudi</span>
              </button>
            </div>
            <div className="flex justify-center rounded-lg bg-white p-4">
              <img
                src={`/api/admin/qr?text=${encodeURIComponent(accessUrlFor(qrPreview.code))}`}
                alt={`QR ${qrPreview.code}`}
                className="h-56 w-56"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value={accessUrlFor(qrPreview.code)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground" />
              <a
                href={accessUrlFor(qrPreview.code)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Apri link
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
