/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Eraser, FilePlus2, Loader2, Printer, QrCode, Settings2 } from "lucide-react";
import { codeAccessPath } from "@/lib/code-access-link";

export interface QrSheetEntry {
  id: string;
  codeId: string;
  code: string;
  displayName: string | null;
}

interface BulkQrGeneratorProps {
  eventId: string;
  event: {
    internalName: string;
    region: string;
    startsAt: string;
    endsAt: string | null;
  };
  initialBaseUrl: string;
  selectedEntries: QrSheetEntry[];
  onCreated: (entries: QrSheetEntry[]) => void;
}

const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";
const checkboxClass = "h-4 w-4 rounded border-surface-border bg-background";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value: string | null): string {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizedBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function BulkQrGenerator({ eventId, event, initialBaseUrl, selectedEntries, onCreated }: BulkQrGeneratorProps) {
  const [count, setCount] = useState(24);
  const [displayNamePrefix, setDisplayNamePrefix] = useState("Partecipante");
  const [title, setTitle] = useState(event.internalName);
  const [subtitle, setSubtitle] = useState("Accesso evento");
  const [infoLine, setInfoLine] = useState(`${event.region} - ${formatDateTime(event.startsAt)}`);
  const [footer, setFooter] = useState("Scansiona il QR oppure inserisci il codice.");
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [accentColor, setAccentColor] = useState("#111827");
  const [columns, setColumns] = useState(3);
  const [qrTarget, setQrTarget] = useState<"link" | "code">("link");
  const [showCode, setShowCode] = useState(true);
  const [showUsername, setShowUsername] = useState(true);
  const [showEventName, setShowEventName] = useState(false);
  const [showRegion, setShowRegion] = useState(true);
  const [showDates, setShowDates] = useState(true);
  const [entries, setEntries] = useState<QrSheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUsableEntries = useMemo(
    () => selectedEntries.filter((entry) => entry.code && entry.codeId),
    [selectedEntries],
  );

  function qrText(entry: QrSheetEntry): string {
    if (qrTarget === "code") return entry.code;
    return `${normalizedBaseUrl(baseUrl)}${codeAccessPath(entry.code)}`;
  }

  function previewQrSrc(entry: QrSheetEntry): string {
    return `/api/admin/qr?text=${encodeURIComponent(qrText(entry))}`;
  }

  function detailLines(entry: QrSheetEntry): string[] {
    const lines: string[] = [];
    if (showUsername && entry.displayName) lines.push(`Username: ${entry.displayName}`);
    if (showEventName) lines.push(event.internalName);
    if (showRegion) lines.push(event.region);
    if (showDates) {
      lines.push(`Inizio: ${formatDateTime(event.startsAt)}`);
      if (event.endsAt) lines.push(`Fine: ${formatDateTime(event.endsAt)}`);
    }
    if (infoLine.trim()) lines.push(infoLine.trim());
    return lines;
  }

  async function createBulk(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/participants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          count,
          displayNamePrefix: displayNamePrefix.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Non sono riuscito a creare i codici in massa.");
        return;
      }

      setEntries(data.participants);
      onCreated(data.participants);
    } finally {
      setLoading(false);
    }
  }

  function useSelectedEntries() {
    if (selectedUsableEntries.length === 0) return;
    setEntries(selectedUsableEntries);
    setError(null);
  }

  function buildPrintHtml(): string {
    const adminOrigin = window.location.origin;
    const safeTitle = escapeHtml(title.trim() || event.internalName);
    const safeSubtitle = escapeHtml(subtitle.trim());
    const safeFooter = escapeHtml(footer.trim());
    const safeAccent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#111827";
    const qrSize = columns === 2 ? 36 : columns === 3 ? 28 : 22;
    const gap = columns === 2 ? 7 : 5;

    const cards = entries
      .map((entry, index) => {
        const lines = detailLines(entry)
          .map((line) => `<div class="meta-line">${escapeHtml(line)}</div>`)
          .join("");
        const code = showCode ? `<div class="code">${escapeHtml(entry.code)}</div>` : "";
        const qrSrc = `${adminOrigin}/api/admin/qr?text=${encodeURIComponent(qrText(entry))}`;

        return `
          <article class="qr-card">
            <div class="card-accent"></div>
            <div class="card-top">
              <div class="card-title">${safeTitle}</div>
              ${safeSubtitle ? `<div class="card-subtitle">${safeSubtitle}</div>` : ""}
            </div>
            <img class="qr" src="${qrSrc}" alt="QR ${index + 1}" />
            ${code}
            <div class="meta">${lines}</div>
            ${safeFooter ? `<div class="footer">${safeFooter}</div>` : ""}
          </article>
        `;
      })
      .join("");

    return `<!doctype html>
      <html lang="it">
        <head>
          <meta charset="utf-8" />
          <title>${safeTitle} - QR</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f3f4f6;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .toolbar {
              position: sticky;
              top: 0;
              z-index: 2;
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 12px 16px;
              background: #111827;
              color: #ffffff;
              font-size: 13px;
            }
            .toolbar button {
              border: 0;
              border-radius: 8px;
              background: #ffffff;
              color: #111827;
              padding: 8px 12px;
              font-weight: 700;
              cursor: pointer;
            }
            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 0;
              background: #ffffff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(${columns}, minmax(0, 1fr));
              gap: ${gap}mm;
              padding: 0;
            }
            .qr-card {
              position: relative;
              break-inside: avoid;
              overflow: hidden;
              min-height: ${columns === 2 ? 86 : 68}mm;
              border: 1px solid #d1d5db;
              border-radius: 11px;
              padding: 9mm 5mm 5mm;
              text-align: center;
              background: #ffffff;
            }
            .card-accent {
              position: absolute;
              inset: 0 0 auto;
              height: 4mm;
              background: ${safeAccent};
            }
            .card-title {
              font-size: ${columns === 4 ? 10 : 12}px;
              font-weight: 800;
              letter-spacing: .03em;
              text-transform: uppercase;
            }
            .card-subtitle {
              margin-top: 1.2mm;
              color: #4b5563;
              font-size: ${columns === 4 ? 8 : 9}px;
            }
            .qr {
              display: block;
              width: ${qrSize}mm;
              height: ${qrSize}mm;
              margin: 4mm auto 3mm;
            }
            .code {
              display: inline-block;
              border: 1px solid #111827;
              border-radius: 999px;
              padding: 1.5mm 3mm;
              font-family: "Courier New", monospace;
              font-size: ${columns === 4 ? 10 : 12}px;
              font-weight: 800;
              letter-spacing: .12em;
            }
            .meta {
              margin-top: 3mm;
              color: #374151;
              font-size: ${columns === 4 ? 7.5 : 8.5}px;
              line-height: 1.35;
            }
            .meta-line + .meta-line { margin-top: .7mm; }
            .footer {
              margin-top: 3mm;
              border-top: 1px solid #e5e7eb;
              padding-top: 2mm;
              color: #6b7280;
              font-size: ${columns === 4 ? 7.5 : 8}px;
              line-height: 1.3;
            }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none; }
              .sheet { width: auto; min-height: auto; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <span>${entries.length} QR - A4</span>
            <button onclick="window.print()">Stampa</button>
          </div>
          <main class="sheet">
            <section class="grid">${cards}</section>
          </main>
          <script>
            window.addEventListener("load", () => setTimeout(() => window.print(), 500));
          </script>
        </body>
      </html>`;
  }

  function printSheet() {
    if (entries.length === 0) return;
    if (qrTarget === "link" && !normalizedBaseUrl(baseUrl)) {
      setError("Imposta il link base prima di stampare QR con link.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=980,height=1200");
    if (!printWindow) {
      setError("Popup bloccato: abilita le finestre popup per stampare il foglio.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
  }

  const previewEntries = entries.slice(0, 6);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-surface-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <QrCode size={17} aria-hidden="true" />
            Generatore QR in massa
          </h2>
          <p className="mt-1 text-xs text-muted">
            Crea nuovi codici o impagina quelli selezionati in un foglio A4 stampabile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useSelectedEntries}
            disabled={selectedUsableEntries.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            <QrCode size={16} aria-hidden="true" />
            Usa selezionati ({selectedUsableEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setEntries([])}
            disabled={entries.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            <Eraser size={16} aria-hidden="true" />
            Svuota
          </button>
          <button
            type="button"
            onClick={printSheet}
            disabled={entries.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Printer size={16} aria-hidden="true" />
            Stampa A4
          </button>
        </div>
      </div>

      <form onSubmit={createBulk} className="grid gap-3 md:grid-cols-[130px_minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">Quantita</span>
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">Prefisso username</span>
          <input value={displayNamePrefix} onChange={(e) => setDisplayNamePrefix(e.target.value)} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          Crea e impagina
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Titolo</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Sottotitolo</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-wide text-muted">Link base per i QR</span>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Riga info</span>
            <input value={infoLine} onChange={(e) => setInfoLine(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Nota footer</span>
            <input value={footer} onChange={(e) => setFooter(e.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Contenuto QR</span>
              <select value={qrTarget} onChange={(e) => setQrTarget(e.target.value as "link" | "code")} className={inputClass}>
                <option value="link">Link accesso</option>
                <option value="code">Solo codice</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colonne A4</span>
              <select value={columns} onChange={(e) => setColumns(Number(e.target.value))} className={inputClass}>
                <option value={2}>2 colonne</option>
                <option value={3}>3 colonne</option>
                <option value={4}>4 colonne</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore</span>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 rounded-lg border border-surface-border bg-background p-1"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:col-span-2">
            {[
              ["Codice", showCode, setShowCode],
              ["Username", showUsername, setShowUsername],
              ["Evento", showEventName, setShowEventName],
              ["Regione", showRegion, setShowRegion],
              ["Date", showDates, setShowDates],
            ].map(([label, checked, setter]) => (
              <label key={label as string} className="inline-flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(e) => (setter as (value: boolean) => void)(e.target.checked)}
                  className={checkboxClass}
                />
                {label as string}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border p-3">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
            <Settings2 size={14} aria-hidden="true" />
            Anteprima
          </p>
          {previewEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2 text-black">
              {previewEntries.map((entry) => (
                <div key={entry.codeId} className="rounded-lg border border-neutral-300 p-2 text-center">
                  <div className="mx-auto mb-1 h-1.5 w-full rounded-full" style={{ background: accentColor }} />
                  <p className="truncate text-[10px] font-bold uppercase">{title || event.internalName}</p>
                  <img src={previewQrSrc(entry)} alt={`QR ${entry.code}`} className="mx-auto my-1 h-20 w-20" />
                  {showCode && <p className="font-mono text-[10px] font-bold tracking-widest">{entry.code}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Crea codici o usa quelli selezionati per vedere il foglio.</p>
          )}
          {entries.length > previewEntries.length && (
            <p className="mt-2 text-xs text-muted">+ altri {entries.length - previewEntries.length} QR nel foglio.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
