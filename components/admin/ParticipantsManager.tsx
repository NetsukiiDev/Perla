/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, ExternalLink, Link2, QrCode, RotateCcw, Trash2, UserPlus, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { CopyButton } from "./CopyButton";
import { iconButtonClass } from "./IconButton";

import { codeAccessPath } from "@/lib/code-access-link";
import { getDisplayStatusLabels, type DisplayStatus } from "@/lib/status";
import { useT } from "@/lib/i18n/context";

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
  initialBaseUrl,
  initialParticipants,
}: {
  eventId: string;
  initialBaseUrl: string;
  initialParticipants: ParticipantRow[];
}) {
  const t = useT();
  const displayLabels = getDisplayStatusLabels(t);
  const router = useRouter();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<{ name: string; code: string } | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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
    setRegenerating(codeId);
    try {
      const res = await fetch(`/api/admin/codes/${codeId}/regenerate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRevealed({ name: participantName === "codice" ? "" : participantName, code: data.code });
        router.refresh();
      }
    } finally {
      setRegenerating(null);
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

  async function deleteCodes(codeIds: string[], singleCodeId?: string) {
    if (codeIds.length === 0) return;
    const ok = window.confirm(
      codeIds.length === 1
        ? t.participants.manager.confirmDelete
        : t.participants.manager.confirmBulkDelete.replace("{count}", String(codeIds.length)),
    );
    if (!ok) return;

    if (singleCodeId) setDeleting(singleCodeId);
    else setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/codes/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, codeIds }),
      });
      if (!res.ok) {
        setBulkError(t.participants.manager.errors.deleteFailed);
        return;
      }
      setSelectedCodeIds((current) => current.filter((id) => !codeIds.includes(id)));
      router.refresh();
    } finally {
      setBulkLoading(false);
      if (singleCodeId) setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">{t.participants.manager.username}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t.participants.manager.usernamePlaceholder} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <UserPlus size={16} aria-hidden="true" />
          {t.participants.manager.generate}
        </button>
      </form>

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-wide text-muted">
                {revealed.name ? `${t.participants.manager.generated} per ${revealed.name}` : t.participants.manager.generated}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-2xl tracking-widest">{revealed.code}</span>
                <CopyButton value={revealed.code} />
                <CopyButton
                  value={accessUrlFor(revealed.code)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-xs text-muted hover:text-foreground"
                />
                <button
                  type="button"
                  title={t.participants.manager.showQR}
                  aria-label={t.participants.manager.showQR}
                  onClick={() => setQrPreview({ code: revealed.code, displayName: revealed.name || null })}
                  className={iconButtonClass()}
                >
                  <QrCode size={16} aria-hidden="true" />
                  <span className="sr-only">{t.participants.manager.showQR}</span>
                </button>
              </div>
            </div>
            {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
            <img
              src={`/api/admin/qr?text=${encodeURIComponent(accessUrlFor(revealed.code))}`}
              alt={`QR ${revealed.code}`}
              className="h-24 w-24 rounded-lg bg-white p-2"
            />
          </div>
          <button
            type="button"
            title={t.participants.manager.hideCode}
            aria-label={t.participants.manager.hideCode}
            onClick={() => setRevealed(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">{t.participants.manager.hideCode}</span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          placeholder={t.participants.manager.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">{t.participants.manager.allStatuses}</option>
          {Object.entries(displayLabels).map(([value, label]) => (
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
            {t.participants.manager.selectedCount.replace("{count}", String(activeSelectedCodeIds.length))}
          </p>
          <button
            type="button"
            onClick={() => void deleteCodes(activeSelectedCodeIds)}
            disabled={bulkLoading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 text-sm text-danger hover:border-danger disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            {t.participants.manager.deleteSelected}
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
              <th className="px-4 py-3">{t.participants.manager.table.code}</th>
              <th className="px-4 py-3">{t.participants.manager.table.username}</th>
              <th className="px-4 py-3">{t.participants.manager.table.status}</th>
              <th className="px-4 py-3">{t.participants.manager.table.step}</th>
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
                        title={t.participants.manager.showQR}
                        aria-label={t.participants.manager.showQR}
                        onClick={() => setQrPreview({ code: r.code!, displayName: r.displayName })}
                        className={iconButtonClass()}
                      >
                        <QrCode size={16} aria-hidden="true" />
                        <span className="sr-only">{t.participants.manager.showQR}</span>
                      </button>
                      <a
                        href={accessUrlFor(r.code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={iconButtonClass()}
                        title={t.participants.detail.access.openLink}
                        aria-label={t.participants.detail.access.openLink}
                      >
                        <Link2 size={16} aria-hidden="true" />
                        <span className="sr-only">{t.participants.detail.access.openLink}</span>
                      </a>
                    </span>
                  ) : (
                    <span className="text-muted">{t.participants.manager.na}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{r.displayName ?? t.participants.manager.na}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={r.displayStatus} label={displayLabels[r.displayStatus]} />
                </td>
                <td className="px-4 py-3 text-muted">{r.currentStep ? `${r.currentStep}/${r.stepsCount}` : t.participants.manager.na}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {r.codeId && (
                      <button
                        type="button"
                        title={t.participants.manager.actions.regenerate}
                        aria-label={t.participants.manager.actions.regenerate}
                        onClick={() => regenerate(r.codeId!, r.displayName ?? "codice")}
                        disabled={regenerating === r.codeId}
                        className={iconButtonClass()}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        <span className="sr-only">{t.participants.manager.actions.regenerate}</span>
                      </button>
                    )}
                    <Link
                      href={`/admin/events/${eventId}/participants/${r.id}`}
                      title={t.participants.manager.actions.openParticipant}
                      aria-label={t.participants.manager.actions.openParticipant}
                      className={iconButtonClass()}
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                      <span className="sr-only">{t.participants.manager.actions.openParticipant}</span>
                    </Link>
                    {r.codeId && (
                      <button
                        type="button"
                        title={t.participants.manager.actions.delete}
                        aria-label={t.participants.manager.actions.delete}
                        onClick={() => void deleteCodes([r.codeId!], r.codeId!)}
                        disabled={Boolean(deleting === r.codeId || bulkLoading)}
                        className={iconButtonClass("danger")}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span className="sr-only">{t.participants.manager.actions.delete}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  {t.participants.manager.empty}
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
                <p className="text-xs uppercase tracking-wide text-muted">{t.participants.manager.qrModal.title}</p>
                <h2 className="mt-1 font-mono text-xl tracking-widest">{qrPreview.code}</h2>
                {qrPreview.displayName && <p className="text-sm text-muted">{qrPreview.displayName}</p>}
              </div>
              <button
                type="button"
                title={t.participants.manager.qrModal.close}
                aria-label={t.participants.manager.qrModal.close}
                onClick={() => setQrPreview(null)}
                className={iconButtonClass()}
              >
                <X size={16} aria-hidden="true" />
                <span className="sr-only">{t.participants.manager.qrModal.close}</span>
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
                {t.participants.detail.access.openLink}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
