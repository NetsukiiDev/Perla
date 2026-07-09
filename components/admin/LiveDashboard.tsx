"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Link2, MapPin, Search } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { SessionActionsMenu } from "./SessionActionsMenu";
import { CopyButton } from "./CopyButton";
import { CodeStatusToggle } from "./CodeStatusToggle";
import { iconButtonClass } from "./IconButton";
import { codeAccessPath } from "@/lib/code-access-link";
import { getDisplayStatusLabels, inviteCodeStatusLabel, type DisplayStatus } from "@/lib/status";
import { useT } from "@/lib/i18n/context";

const LiveMap = dynamic(() => import("./LiveMap").then((m) => m.LiveMap), { ssr: false });

interface LiveRow {
  participantId: string;
  displayName: string | null;
  code: string | null;
  sessionId: string | null;
  codeId: string | null;
  codeStatus: string | null;
  sessionStatus: string | null;
  displayStatus: DisplayStatus;
  currentStep: number | null;
  stepsCount: number;
  lastSeenAt: string | null;
  lastLocation: { lat: number; lng: number } | null;
  ipAddress: string | null;
  ipIsp: string | null;
}

interface EventLocation {
  lat: number;
  lng: number;
  label: string;
}

const POLL_MS = 5000;

function formatTime(value: string | null): string {
  return value ? new Date(value).toLocaleTimeString("it-IT") : "N/D";
}

function formatCoords(value: { lat: number; lng: number } | null): string {
  return value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "N/D";
}

export function LiveDashboard({ eventId }: { eventId: string }) {
  const t = useT();
  const labels = getDisplayStatusLabels(t);
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [eventLocation, setEventLocation] = useState<EventLocation | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => { setPage(0); }, [search]);

  const refresh = useCallback(() => {
    fetch(`/api/admin/events/${eventId}/live`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.participants);
        setEventLocation(data.eventLocation);
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  if (!rows) {
    return <p className="text-sm text-muted">Caricamento...</p>;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((r) => {
        const code = r.code?.toLowerCase() ?? "";
        const username = r.displayName?.toLowerCase() ?? "";
        return code.includes(normalizedSearch) || username.includes(normalizedSearch);
      })
    : rows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = filteredRows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const from = filteredRows.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min((safePage + 1) * pageSize, filteredRows.length);

  const participantMarkers = filteredRows
    .filter((r): r is LiveRow & { lastLocation: { lat: number; lng: number } } => r.lastLocation !== null)
    .map((r) => ({
      id: r.participantId,
      lat: r.lastLocation.lat,
      lng: r.lastLocation.lng,
      label: r.code ? `${r.code}${r.displayName ? ` - ${r.displayName}` : ""}` : (r.displayName ?? "Codice"),
      type: "participant" as const,
    }));

  const markers = [
    ...(eventLocation
      ? [
          {
            id: "event-location",
            lat: eventLocation.lat,
            lng: eventLocation.lng,
            label: `Evento - ${eventLocation.label}`,
            type: "event" as const,
          },
        ]
      : []),
    ...participantMarkers,
  ];

  return (
    <div className="flex flex-col gap-6">
      <LiveMap markers={markers} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-72 flex-1 items-center gap-2 rounded-lg border border-surface-border bg-background px-3 py-2">
          <Search size={16} aria-hidden="true" className="text-muted" />
          <input
            placeholder="Cerca per codice o username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
        <span className="text-xs text-muted">
          {filteredRows.length}/{rows.length} partecipanti
        </span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          className="rounded-lg border border-surface-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          {[5, 10, 25, 50].map((n) => (
            <option key={n} value={n}>{n} per pagina</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Codice</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Percorso</th>
              <th className="px-4 py-3">Segnale</th>
              <th className="px-4 py-3">Accesso</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((r) => (
              <tr key={r.participantId} className="border-b border-surface-border last:border-0 hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3">
                  {r.code ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/admin/events/${eventId}/participants/${r.participantId}`}
                          className="font-mono tracking-widest hover:underline"
                        >
                          {r.code}
                        </Link>
                        <CopyButton value={r.code} />
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
                        {r.lastLocation && <MapPin size={14} className="text-emerald-400" />}
                      </span>
                      <span className="text-xs text-muted">{r.displayName ?? <span className="italic">N/D</span>}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="font-mono tracking-widest text-muted italic">{r.displayName ?? "N/D"}</span>
                      <span className="text-xs text-muted italic">Nessun codice</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={r.displayStatus} label={labels[r.displayStatus] ?? r.displayStatus} />
                </td>
                <td className="px-4 py-3 text-muted">{r.currentStep ? `${r.currentStep} di ${r.stepsCount}` : <span className="italic">N/D</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-muted">
                    <span>{formatTime(r.lastSeenAt)}</span>
                    <span className="font-mono text-xs">{formatCoords(r.lastLocation)}</span>
                    <span className="font-mono text-xs">{r.ipAddress ? r.ipAddress : <span className="italic">IP N/D</span>}</span>
                    <span className="text-xs">{r.ipIsp ? r.ipIsp : <span className="italic">ISP N/D</span>}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.codeId ? (
                    <div className="flex flex-col items-start gap-1">
                      <CodeStatusToggle codeId={r.codeId} codeStatus={r.codeStatus} compact onChanged={refresh} />
                      <span className="text-xs text-muted">{inviteCodeStatusLabel(r.codeStatus, t)}</span>
                    </div>
                  ) : (
                    <span className="text-muted italic">N/D</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/events/${eventId}/participants/${r.participantId}`}
                      title="Apri partecipante"
                      aria-label="Apri partecipante"
                      className={iconButtonClass()}
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                      <span className="sr-only">Apri partecipante</span>
                    </Link>
                    <SessionActionsMenu
                      sessionId={r.sessionId}
                      sessionStatus={r.sessionStatus}
                      onChanged={refresh}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  <p>{rows.length === 0 ? "Nessun partecipante." : "Nessun risultato. Prova a modificare i filtri."}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Mostrati da {from} a {to} di {filteredRows.length} risultati
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Precedente
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-30"
            >
              Successiva
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
