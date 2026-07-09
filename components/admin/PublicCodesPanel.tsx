"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ExternalLink, Globe, Trash2, X } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { iconButtonClass } from "./IconButton";
import { codeAccessPath } from "@/lib/code-access-link";

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
  const [maxSessions, setMaxSessions] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  function accessUrlFor(code: string): string {
    return `${initialBaseUrl.replace(/\/$/, "")}${codeAccessPath(code)}`;
  }

  async function create() {
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
        setError("Impossibile creare il codice pubblico.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revocare questo codice pubblico? I nuovi accessi verranno bloccati.")) return;
    await fetch(`/api/admin/codes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!window.confirm("Eliminare definitivamente questo codice pubblico?")) return;
    await fetch(`/api/admin/codes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-surface-border p-4">
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Codici pubblici</h2>
      </div>
      <p className="text-xs text-muted">
        Un codice pubblico è usabile da più persone, senza scadenza. Ogni persona diventa un &quot;Ospite&quot; tracciato singolarmente, fino al numero massimo di utilizzi.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">Utilizzi massimi</label>
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
          type="button"
          onClick={create}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Globe size={16} aria-hidden="true" />
          {loading ? "Creazione..." : "Crea codice pubblico"}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Codice pubblico generato</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl tracking-widest">{revealed}</span>
              <CopyButton value={revealed} />
              <CopyButton
                value={accessUrlFor(revealed)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-xs text-muted hover:text-foreground"
              />
            </div>
          </div>
          <button
            type="button"
            title="Nascondi"
            aria-label="Nascondi"
            onClick={() => setRevealed(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">Nascondi</span>
          </button>
        </div>
      )}

      {initialCodes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Codice</th>
                <th className="px-4 py-2">Utilizzi</th>
                <th className="px-4 py-2">Stato</th>
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
                          href={codeAccessPath(c.code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={iconButtonClass()}
                          title="Apri link accesso"
                          aria-label="Apri link accesso"
                        >
                          <ExternalLink size={16} aria-hidden="true" />
                          <span className="sr-only">Apri link accesso</span>
                        </a>
                      </span>
                    ) : (
                      <span className="text-muted">N/D</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {c.used}/{c.maxSessions}
                  </td>
                  <td className="px-4 py-2">
                    {c.status === "revoked" ? (
                      <span className="text-danger">Revocato</span>
                    ) : (
                      <span className="text-emerald-400">Attivo · senza scadenza</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {c.status !== "revoked" && (
                        <button
                          type="button"
                          title="Revoca"
                          aria-label="Revoca"
                          onClick={() => void revoke(c.id)}
                          className={iconButtonClass()}
                        >
                          <Ban size={16} aria-hidden="true" />
                          <span className="sr-only">Revoca</span>
                        </button>
                      )}
                      <button
                        type="button"
                        title="Elimina"
                        aria-label="Elimina"
                        onClick={() => void del(c.id)}
                        className={iconButtonClass("danger")}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span className="sr-only">Elimina</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
