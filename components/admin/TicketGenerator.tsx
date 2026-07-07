/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FilePlus2, ImageOff, Loader2, Printer, Ticket, Upload } from "lucide-react";
import { codeAccessPath } from "@/lib/code-access-link";

export interface TicketEntry {
  id: string;
  codeId: string | null;
  code: string | null;
  displayName: string | null;
}

interface TicketGeneratorProps {
  eventId: string;
  event: { internalName: string; region: string; startsAt: string; endsAt: string | null };
  initialBaseUrl: string;
  entries: TicketEntry[];
}

interface FontOption {
  label: string;
  value: string;
  google?: string;
}

const FONT_OPTIONS: FontOption[] = [
  { label: "Anton (grassetto, condensato)", value: "Anton", google: "Anton" },
  { label: "Bebas Neue", value: "Bebas Neue", google: "Bebas+Neue" },
  { label: "Archivo Black", value: "Archivo Black", google: "Archivo+Black" },
  { label: "Oswald", value: "Oswald", google: "Oswald:wght@400;600;700" },
  { label: "Poppins", value: "Poppins", google: "Poppins:wght@400;600;800" },
  { label: "Inter", value: "Inter", google: "Inter:wght@400;600;800" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Personalizzato (Google Fonts)...", value: "__custom__" },
];

const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";
const checkboxClass = "h-4 w-4 rounded border-surface-border bg-background";
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizedBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hexToRgba(hex: string, opacityPercent: number): string {
  const safe = HEX_PATTERN.test(hex) ? hex : "#ffffff";
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacityPercent)) / 100})`;
}

function googleFontUrl(spec: string): string {
  return `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
}

export function TicketGenerator({ eventId, event, initialBaseUrl, entries }: TicketGeneratorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection / creation
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [count, setCount] = useState(24);
  const [displayNamePrefix, setDisplayNamePrefix] = useState("Partecipante");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR
  const [qrTarget, setQrTarget] = useState<"link" | "code">("link");
  const [qrPosition, setQrPosition] = useState<"left" | "right">("left");
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [qrBoxColor, setQrBoxColor] = useState("#ffffff");
  const [qrModuleColor, setQrModuleColor] = useState("#0a0a0b");
  const [showCodeUnderQr, setShowCodeUnderQr] = useState(true);

  // Text
  const [text, setText] = useState(event.internalName.toUpperCase());
  const [fontChoice, setFontChoice] = useState("Anton");
  const [customFontName, setCustomFontName] = useState("");
  const [fontWeight, setFontWeight] = useState(800);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [uppercaseText, setUppercaseText] = useState(true);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(0.95);
  const [autoFitFont, setAutoFitFont] = useState(true);
  const [manualFontSizeMm, setManualFontSizeMm] = useState(9);

  // Background
  const [bgColor, setBgColor] = useState("#000000");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgImageFit, setBgImageFit] = useState<"cover" | "contain">("cover");
  const [bgDim, setBgDim] = useState(0);

  // Divider
  const [showDivider, setShowDivider] = useState(true);
  const [dividerColor, setDividerColor] = useState("#ffffff");
  const [dividerOpacity, setDividerOpacity] = useState(35);

  // Layout / print
  const [cardWidthMm, setCardWidthMm] = useState(90);
  const [cardHeightMm, setCardHeightMm] = useState(50);
  const [paddingMm, setPaddingMm] = useState(6);
  const [cornerRadiusMm, setCornerRadiusMm] = useState(0);
  const [columns, setColumns] = useState(3);
  const [pageOrientation, setPageOrientation] = useState<"portrait" | "landscape">("portrait");

  const validCodeIds = useMemo(() => new Set(entries.map((e) => e.codeId).filter(Boolean) as string[]), [entries]);
  const activeSelectedCodeIds = selectedCodeIds.filter((id) => validCodeIds.has(id));
  const selectedSet = new Set(activeSelectedCodeIds);
  const usableEntries = useMemo(() => entries.filter((e) => e.code && e.codeId), [entries]);
  const selectedEntries = usableEntries.filter((e) => selectedSet.has(e.codeId as string));
  const allSelected = usableEntries.length > 0 && usableEntries.every((e) => selectedSet.has(e.codeId as string));

  const fontFamily = fontChoice === "__custom__" ? customFontName.trim() || "sans-serif" : fontChoice;
  const activeGoogleFont =
    fontChoice === "__custom__"
      ? customFontName.trim()
        ? `${encodeURIComponent(customFontName.trim())}:wght@400;700;900`
        : null
      : (FONT_OPTIONS.find((f) => f.value === fontChoice)?.google ?? null);

  useEffect(() => {
    if (!activeGoogleFont) return;
    const id = "ticket-generator-google-font";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontUrl(activeGoogleFont);
  }, [activeGoogleFont]);

  const DIVIDER_WIDTH_MM = 0.6;
  const GAP_MM = 5;

  // Symmetric two-column layout: QR side and text side always get an equal share of the
  // card width, with the QR capped to a square that also fits the available height.
  const halfWidthMm = useMemo(() => {
    const dividerSpaceMm = showDivider ? DIVIDER_WIDTH_MM + GAP_MM * 2 : GAP_MM;
    return Math.max((cardWidthMm - paddingMm * 2 - dividerSpaceMm) / 2, 10);
  }, [cardWidthMm, paddingMm, showDivider]);

  const qrSizeMm = Math.min(halfWidthMm, cardHeightMm - paddingMm * 2);

  // A4 print sheet: 210x297mm (swapped when landscape), minus the @page margin and the
  // sheet's own padding. Grid columns must use the card's real width (mm), not `1fr` —
  // otherwise fixed-width tickets overflow their grid cell and get sliced off by the
  // physical page edge.
  const A4_SHORT_MM = 210;
  const A4_LONG_MM = 297;
  const PAGE_MARGIN_MM = 10;
  const SHEET_PADDING_MM = 4;
  const GRID_GAP_MM = 4;
  const pageWidthMm = pageOrientation === "landscape" ? A4_LONG_MM : A4_SHORT_MM;
  const pageHeightMm = pageOrientation === "landscape" ? A4_SHORT_MM : A4_LONG_MM;
  const printableWidthMm = pageWidthMm - PAGE_MARGIN_MM * 2 - SHEET_PADDING_MM * 2;
  const printableHeightMm = pageHeightMm - PAGE_MARGIN_MM * 2 - SHEET_PADDING_MM * 2;
  const maxColumnsThatFit = Math.max(1, Math.floor((printableWidthMm + GRID_GAP_MM) / (cardWidthMm + GRID_GAP_MM)));
  const maxRowsPerPage = Math.max(1, Math.floor((printableHeightMm + GRID_GAP_MM) / (cardHeightMm + GRID_GAP_MM)));
  const effectiveColumns = Math.min(columns, maxColumnsThatFit);

  function fitNineOnLandscapePage() {
    setPageOrientation("landscape");
    setColumns(3);
    const wp = A4_LONG_MM - PAGE_MARGIN_MM * 2 - SHEET_PADDING_MM * 2;
    const hp = A4_SHORT_MM - PAGE_MARGIN_MM * 2 - SHEET_PADDING_MM * 2;
    setCardWidthMm(Math.floor((wp - GRID_GAP_MM * 2) / 3) - 1);
    setCardHeightMm(Math.floor((hp - GRID_GAP_MM * 2) / 3) - 1);
  }

  const computedFontSizeMm = useMemo(() => {
    if (!autoFitFont) return manualFontSizeMm;
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const lineCount = Math.max(lines.length, 1);
    const availableHeightMm = cardHeightMm - paddingMm * 2;
    const byHeight = availableHeightMm / lineCount / (lineHeight * 1.15);
    const longest = Math.max(...lines.map((l) => l.length), 1);
    const byWidth = (halfWidthMm / longest) * 1.7;
    return Math.max(4, Math.min(byHeight, byWidth, 40));
  }, [autoFitFont, manualFontSizeMm, text, cardHeightMm, paddingMm, lineHeight, halfWidthMm]);

  function toggle(codeId: string, checked: boolean) {
    setSelectedCodeIds((current) => {
      if (checked) return Array.from(new Set([...current, codeId]));
      return current.filter((id) => id !== codeId);
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedCodeIds(checked ? usableEntries.map((e) => e.codeId as string) : []);
  }

  async function createBulk(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/participants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, count, displayNamePrefix: displayNamePrefix.trim() || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Non sono riuscito a creare i codici in massa.");
        return;
      }
      setSelectedCodeIds((data.participants as TicketEntry[]).map((p) => p.codeId as string));
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function qrText(entry: TicketEntry): string {
    if (qrTarget === "code") return entry.code as string;
    return `${normalizedBaseUrl(baseUrl)}${codeAccessPath(entry.code as string)}`;
  }

  function qrSrc(entry: TicketEntry, origin = ""): string {
    const params = new URLSearchParams({
      text: qrText(entry),
      dark: HEX_PATTERN.test(qrModuleColor) ? qrModuleColor : "#0a0a0b",
      light: HEX_PATTERN.test(qrBoxColor) ? qrBoxColor : "#ffffff",
    });
    return `${origin}/api/admin/qr?${params.toString()}`;
  }

  const dividerRgba = hexToRgba(dividerColor, dividerOpacity);
  const displayText = uppercaseText ? text.toUpperCase() : text;

  const cardStyle = {
    width: `${cardWidthMm}mm`,
    height: `${cardHeightMm}mm`,
    background: bgColor,
    borderRadius: `${cornerRadiusMm}mm`,
    padding: `${paddingMm}mm`,
  };

  function renderPreviewCard(entry: TicketEntry | null, key: string) {
    const qrBlock = (
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-1"
        style={{ width: `${halfWidthMm}mm` }}
      >
        <div
          className="flex items-center justify-center rounded-md"
          style={{ background: qrBoxColor, width: `${qrSizeMm}mm`, height: `${qrSizeMm}mm`, padding: "3%" }}
        >
          {entry ? (
            <img src={qrSrc(entry)} alt={`QR ${entry.code}`} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[8px] text-neutral-400">QR</div>
          )}
        </div>
        {showCodeUnderQr && entry?.code && (
          <span className="font-mono text-[8px] tracking-widest" style={{ color: textColor }}>
            {entry.code}
          </span>
        )}
      </div>
    );

    const divider = showDivider ? (
      <div style={{ width: `${DIVIDER_WIDTH_MM}mm`, alignSelf: "stretch", background: dividerRgba }} />
    ) : null;

    const textBlock = (
      <div
        className="flex shrink-0 items-center overflow-hidden"
        style={{
          width: `${halfWidthMm}mm`,
          justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            whiteSpace: "pre-line",
            color: textColor,
            fontFamily,
            fontWeight,
            fontSize: `${computedFontSizeMm}mm`,
            lineHeight,
            letterSpacing: `${letterSpacing}em`,
            textAlign,
            wordBreak: "break-word",
          }}
        >
          {displayText || "IL TUO TESTO QUI"}
        </div>
      </div>
    );

    return (
      <article
        key={key}
        className="relative flex shrink-0 items-stretch justify-center overflow-hidden"
        style={{
          ...cardStyle,
          gap: `${GAP_MM}mm`,
          flexDirection: qrPosition === "left" ? "row" : "row-reverse",
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: bgImageFit,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {bgImage && bgDim > 0 && (
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${bgDim / 100})` }} />
        )}
        {qrBlock}
        {divider}
        {textBlock}
      </article>
    );
  }

  function buildPrintHtml(): string {
    const origin = window.location.origin;
    const fontLink = activeGoogleFont ? `<link rel="stylesheet" href="${googleFontUrl(activeGoogleFont)}" />` : "";

    const cards = selectedEntries
      .map((entry) => {
        const qrImg = `<img class="qr" src="${escapeHtml(qrSrc(entry, origin))}" alt="QR" />`;
        const codeLine = showCodeUnderQr && entry.code ? `<div class="code">${escapeHtml(entry.code)}</div>` : "";
        return `
          <article class="ticket" style="flex-direction:${qrPosition === "left" ? "row" : "row-reverse"};">
            ${bgImage ? `<div class="bg-image"></div>` : ""}
            ${bgImage && bgDim > 0 ? `<div class="bg-dim"></div>` : ""}
            <div class="qr-block">
              <div class="qr-box">${qrImg}</div>
              ${codeLine}
            </div>
            ${showDivider ? `<div class="divider"></div>` : ""}
            <div class="text-block" style="justify-content:${textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"};">
              <div class="ticket-text">${escapeHtml(displayText || "")}</div>
            </div>
          </article>
        `;
      })
      .join("");

    return `<!doctype html>
      <html lang="it">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(event.internalName)} - Biglietti</title>
          ${fontLink}
          <style>
            @page { size: A4 ${pageOrientation}; margin: ${PAGE_MARGIN_MM}mm; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #111827; color: #fff; font-size: 13px; }
            .toolbar button { border: 0; border-radius: 8px; background: #fff; color: #111827; padding: 8px 12px; font-weight: 700; cursor: pointer; }
            .sheet { width: 100%; margin: 0 auto; background: #fff; padding: ${SHEET_PADDING_MM}mm; }
            .grid { display: grid; grid-template-columns: repeat(${effectiveColumns}, ${cardWidthMm}mm); justify-content: center; gap: ${GRID_GAP_MM}mm; }
            .ticket {
              position: relative;
              display: flex;
              align-items: stretch;
              justify-content: center;
              gap: ${GAP_MM}mm;
              overflow: hidden;
              break-inside: avoid;
              width: ${cardWidthMm}mm;
              height: ${cardHeightMm}mm;
              background: ${bgColor};
              border-radius: ${cornerRadiusMm}mm;
              padding: ${paddingMm}mm;
              margin: 0 auto;
            }
            .bg-image {
              position: absolute; inset: 0;
              background-image: url(${bgImage ? `'${bgImage}'` : "none"});
              background-size: ${bgImageFit};
              background-position: center;
              background-repeat: no-repeat;
            }
            .bg-dim { position: absolute; inset: 0; background: rgba(0,0,0,${bgDim / 100}); }
            .qr-block { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; flex-shrink: 0; width: ${halfWidthMm}mm; }
            .qr-box { display: flex; align-items: center; justify-content: center; width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; background: ${qrBoxColor}; border-radius: 2mm; padding: 3%; }
            .qr { width: 100%; height: 100%; }
            .code { font-family: "Courier New", monospace; font-size: 2.6mm; letter-spacing: 0.1em; color: ${textColor}; }
            .divider { width: ${DIVIDER_WIDTH_MM}mm; align-self: stretch; background: ${dividerRgba}; }
            .text-block { position: relative; display: flex; flex-shrink: 0; width: ${halfWidthMm}mm; align-items: center; overflow: hidden; }
            .ticket-text {
              white-space: pre-line;
              color: ${textColor};
              font-family: ${fontFamily.replace(/"/g, "'")};
              font-weight: ${fontWeight};
              font-size: ${computedFontSizeMm}mm;
              line-height: ${lineHeight};
              letter-spacing: ${letterSpacing}em;
              text-align: ${textAlign};
              word-break: break-word;
            }
            @media print {
              body { background: #fff; }
              .toolbar { display: none; }
              .sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <span>${selectedEntries.length} biglietti - A4</span>
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
    if (selectedEntries.length === 0) return;
    if (qrTarget === "link" && !normalizedBaseUrl(baseUrl)) {
      setError("Imposta il link base prima di stampare QR con link.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=980,height=1200");
    if (!printWindow) {
      setError("Popup bloccato: abilita le finestre popup per stampare i biglietti.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-surface-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Ticket size={17} aria-hidden="true" />
              Generatore biglietti
            </h2>
            <p className="mt-1 text-xs text-muted">
              Personalizza il biglietto (QR + testo/immagine) e stampalo per i partecipanti selezionati.
            </p>
          </div>
          <button
            type="button"
            onClick={printSheet}
            disabled={selectedEntries.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Printer size={16} aria-hidden="true" />
            Stampa {selectedEntries.length > 0 ? `(${selectedEntries.length})` : ""}
          </button>
        </div>

        <form onSubmit={createBulk} className="grid gap-3 md:grid-cols-[130px_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Quantita</span>
            <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Prefisso username</span>
            <input value={displayNamePrefix} onChange={(e) => setDisplayNamePrefix(e.target.value)} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border border-surface-border px-4 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
            Crea nuovi codici
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className={checkboxClass} />
            Seleziona tutti ({usableEntries.length})
          </label>
          {activeSelectedCodeIds.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted">
              <CheckSquare size={14} aria-hidden="true" /> {activeSelectedCodeIds.length} selezionati
            </span>
          )}
        </div>

        <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <tbody>
              {usableEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-surface-border last:border-0">
                  <td className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(entry.codeId as string)}
                      onChange={(e) => toggle(entry.codeId as string, e.target.checked)}
                      className={checkboxClass}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono tracking-widest">{entry.code}</td>
                  <td className="px-3 py-2 text-muted">{entry.displayName ?? "N/D"}</td>
                </tr>
              ))}
              {usableEntries.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-muted">Nessun codice disponibile. Creane di nuovi qui sopra.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4 rounded-lg border border-surface-border p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Testo</h3>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">Contenuto (a capo = nuova riga)</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Font</span>
              <select value={fontChoice} onChange={(e) => setFontChoice(e.target.value)} className={inputClass}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            {fontChoice === "__custom__" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted">Nome font Google Fonts</span>
                <input value={customFontName} onChange={(e) => setCustomFontName(e.target.value)} placeholder="es. Anton" className={inputClass} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Peso</span>
              <select value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value))} className={inputClass}>
                {[400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Allineamento</span>
              <select value={textAlign} onChange={(e) => setTextAlign(e.target.value as typeof textAlign)} className={inputClass}>
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore testo</span>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 rounded-lg border border-surface-border bg-background p-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Spaziatura lettere (em)</span>
              <input type="number" step={0.01} value={letterSpacing} onChange={(e) => setLetterSpacing(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Altezza riga</span>
              <input type="number" step={0.05} min={0.7} max={1.6} value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Dimensione (mm)</span>
              <input
                type="number"
                min={2}
                max={60}
                value={Math.round(computedFontSizeMm * 10) / 10}
                disabled={autoFitFont}
                onChange={(e) => setManualFontSizeMm(Number(e.target.value))}
                className={`${inputClass} disabled:opacity-50`}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={uppercaseText} onChange={(e) => setUppercaseText(e.target.checked)} className={checkboxClass} />
              Maiuscolo
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={autoFitFont} onChange={(e) => setAutoFitFont(e.target.checked)} className={checkboxClass} />
              Adatta dimensione automaticamente
            </label>
          </div>

          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Sfondo</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore sfondo</span>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-10 rounded-lg border border-surface-border bg-background p-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Adattamento immagine</span>
              <select value={bgImageFit} onChange={(e) => setBgImageFit(e.target.value as typeof bgImageFit)} className={inputClass} disabled={!bgImage}>
                <option value="cover">Riempi (cover)</option>
                <option value="contain">Contieni (contain)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-muted">Oscuramento immagine ({bgDim}%)</span>
              <input type="range" min={0} max={90} value={bgDim} onChange={(e) => setBgDim(Number(e.target.value))} disabled={!bgImage} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
            >
              <Upload size={16} aria-hidden="true" />
              Carica immagine
            </button>
            {bgImage && (
              <button
                type="button"
                onClick={() => setBgImage(null)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
              >
                <ImageOff size={16} aria-hidden="true" />
                Rimuovi immagine
              </button>
            )}
          </div>

          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">QR code</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Contenuto QR</span>
              <select value={qrTarget} onChange={(e) => setQrTarget(e.target.value as typeof qrTarget)} className={inputClass}>
                <option value="link">Link accesso</option>
                <option value="code">Solo codice</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Posizione QR</span>
              <select value={qrPosition} onChange={(e) => setQrPosition(e.target.value as typeof qrPosition)} className={inputClass}>
                <option value="left">Sinistra</option>
                <option value="right">Destra</option>
              </select>
            </label>
            {qrTarget === "link" && (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs uppercase tracking-wide text-muted">Link base</span>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore riquadro QR</span>
              <input type="color" value={qrBoxColor} onChange={(e) => setQrBoxColor(e.target.value)} className="h-10 rounded-lg border border-surface-border bg-background p-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore moduli QR</span>
              <input type="color" value={qrModuleColor} onChange={(e) => setQrModuleColor(e.target.value)} className="h-10 rounded-lg border border-surface-border bg-background p-1" />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={showCodeUnderQr} onChange={(e) => setShowCodeUnderQr(e.target.checked)} className={checkboxClass} />
            Mostra codice sotto il QR
          </label>

          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Divisore e layout</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showDivider} onChange={(e) => setShowDivider(e.target.checked)} className={checkboxClass} />
              Mostra linea divisoria
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colore / opacita divisore ({dividerOpacity}%)</span>
              <div className="flex items-center gap-2">
                <input type="color" value={dividerColor} onChange={(e) => setDividerColor(e.target.value)} className="h-10 w-14 rounded-lg border border-surface-border bg-background p-1" disabled={!showDivider} />
                <input type="range" min={0} max={100} value={dividerOpacity} onChange={(e) => setDividerOpacity(Number(e.target.value))} disabled={!showDivider} className="flex-1" />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Larghezza biglietto (mm)</span>
              <input type="number" min={40} max={200} value={cardWidthMm} onChange={(e) => setCardWidthMm(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Altezza biglietto (mm)</span>
              <input type="number" min={25} max={150} value={cardHeightMm} onChange={(e) => setCardHeightMm(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Padding interno (mm)</span>
              <input type="number" min={0} max={20} value={paddingMm} onChange={(e) => setPaddingMm(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Raggio angoli (mm)</span>
              <input type="number" min={0} max={20} value={cornerRadiusMm} onChange={(e) => setCornerRadiusMm(Number(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Orientamento pagina</span>
              <select value={pageOrientation} onChange={(e) => setPageOrientation(e.target.value as typeof pageOrientation)} className={inputClass}>
                <option value="portrait">Verticale</option>
                <option value="landscape">Orizzontale</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Colonne foglio A4</span>
              <select value={columns} onChange={(e) => setColumns(Number(e.target.value))} className={inputClass}>
                <option value={1}>1 colonna</option>
                <option value={2}>2 colonne</option>
                <option value={3}>3 colonne</option>
                <option value={4}>4 colonne</option>
              </select>
              {effectiveColumns < columns && (
                <span className="text-xs text-danger">
                  Con {cardWidthMm}mm di larghezza ne entrano solo {effectiveColumns} per riga.
                </span>
              )}
            </label>
            <p className="text-xs text-muted sm:col-span-2">
              Con le impostazioni attuali entrano {effectiveColumns * maxRowsPerPage} biglietti per pagina ({effectiveColumns} x {maxRowsPerPage}).
            </p>
            <button
              type="button"
              onClick={fitNineOnLandscapePage}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground sm:col-span-2"
            >
              Adatta per 9 biglietti a pagina (griglia 3x3, orizzontale)
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-surface-border p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Anteprima</h3>
          <div className="flex justify-center overflow-x-auto rounded-lg bg-neutral-200 p-4">
            {renderPreviewCard(selectedEntries[0] ?? null, "preview")}
          </div>
          <p className="text-xs text-muted">
            L&apos;anteprima usa il primo biglietto selezionato (o un segnaposto). La stampa genera un biglietto per ogni codice selezionato.
          </p>
        </section>
      </div>
    </div>
  );
}
