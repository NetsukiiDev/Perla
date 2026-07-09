"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Ban, ExternalLink, Globe, QrCode, Trash2, X } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { iconButtonClass } from "./IconButton";
import { codeAccessPath } from "@/lib/code-access-link";
import { useT } from "@/lib/i18n/context";

export interface PublicCodeRow {
  id: string;
  code: string | null;
  maxSessions: number;
  used: number;
  status: string;
}

const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";

export function PublicCodesPanel({
  eventId,
  initialBaseUrl,
  initialCodes,
}: {
  eventId: string;
  initialBaseUrl: string;
  initialCodes: PublicCodeRow[];
}) {
  const router = useRouter();
  const t = useT();
  const [maxSessions, setMaxSessions] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  function accessUrlFor(code: string): string {
    return `${initialBaseUrl.replace(/\/$/, "")}${codeAccessPath(code)}`;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/codes/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, maxSessions: Number(maxSessions) || 100 }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setRevealed(data.code);
        router.refresh();
      } else {
        setError(t.codes.public.errors.createFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm(t.codes.public.confirm.revoke)) return;
    await fetch(`/api/admin/codes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!window.confirm(t.codes.public.confirm.delete)) return;
    await fetch(`/api/admin/codes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{t.codes.public.title}</h2>
      </div>
      <p className="text-xs text-muted">
        {t.codes.public.description}
      </p>

      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">{t.codes.public.maxUses}</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={maxSessions}
            onChange={(e) => setMaxSessions(e.target.value)}
            className={`${inputClass} w-32`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Globe size={16} aria-hidden="true" />
          {loading ? t.codes.public.creating : t.codes.public.createButton}
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-wide text-muted">{t.codes.public.created}</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-2xl tracking-widest">{revealed}</span>
                <CopyButton value={revealed} />
              </div>
            </div>
          </div>
          <button
            type="button"
            title={t.codes.public.hide}
            aria-label={t.codes.public.hide}
            onClick={() => setRevealed(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">{t.codes.public.hide}</span>
          </button>
        </div>
      )}

      {initialCodes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">{t.codes.public.table.code}</th>
                <th className="px-4 py-2">{t.codes.public.table.uses}</th>
                <th className="px-4 py-2">{t.codes.public.table.status}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {initialCodes.map((c) => (
                <tr key={c.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-2">
                    {c.code ? (
                      <span className="flex items-center gap-2">
                        <span className="font-mono tracking-widest">{c.code}</span>
                        <CopyButton value={c.code} />
                        <a
                          href={accessUrlFor(c.code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={iconButtonClass()}
                          title={t.codes.public.actions.openLink}
                          aria-label={t.codes.public.actions.openLink}
                        >
                          <ExternalLink size={16} aria-hidden="true" />
                          <span className="sr-only">{t.codes.public.actions.openLink}</span>
                        </a>
                      </span>
                    ) : (
                      <span className="text-muted">{t.common.na}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {c.used}/{c.maxSessions}
                  </td>
                  <td className="px-4 py-2">
                    {c.status === "revoked" ? (
                      <span className="text-danger">{t.codes.public.statusRevoked}</span>
                    ) : (
                      <span className="text-emerald-400">{t.codes.public.statusActive}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {c.code && (
                        <button
                          type="button"
                          title={t.codes.public.actions.qr}
                          aria-label={t.codes.public.actions.qr}
                          onClick={() => setQrCode(c.code)}
                          className={iconButtonClass()}
                        >
                          <QrCode size={16} aria-hidden="true" />
                          <span className="sr-only">{t.codes.public.actions.qr}</span>
                        </button>
                      )}
                      {c.status !== "revoked" && (
                        <button
                          type="button"
                          title={t.codes.public.actions.revoke}
                          aria-label={t.codes.public.actions.revoke}
                          onClick={() => void revoke(c.id)}
                          className={iconButtonClass()}
                        >
                          <Ban size={16} aria-hidden="true" />
                          <span className="sr-only">{t.codes.public.actions.revoke}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        title={t.codes.public.actions.delete}
                        aria-label={t.codes.public.actions.delete}
                        onClick={() => void del(c.id)}
                        className={iconButtonClass("danger")}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span className="sr-only">{t.codes.public.actions.delete}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{t.accessShare.qrLink}</p>
                <h2 className="mt-1 font-mono text-xl tracking-widest">{qrCode}</h2>
              </div>
              <button
                type="button"
                title={t.participants.manager.qrModal.close}
                aria-label={t.participants.manager.qrModal.close}
                onClick={() => setQrCode(null)}
                className={iconButtonClass()}
              >
                <X size={16} aria-hidden="true" />
                <span className="sr-only">{t.participants.manager.qrModal.close}</span>
              </button>
            </div>
            <div className="flex justify-center rounded-lg bg-white p-4">
              {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/qr?text=${encodeURIComponent(accessUrlFor(qrCode))}`}
                alt={`QR ${qrCode}`}
                className="h-56 w-56"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton
                value={accessUrlFor(qrCode)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
              />
              <a
                href={accessUrlFor(qrCode)}
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
