"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { CopyButton } from "./CopyButton";

interface AccessSharePanelProps {
  code: string;
  accessUrl: string;
}

async function shareOrCopy(payload: ShareData, fallback: string) {
  if (navigator.share) {
    await navigator.share(payload);
    return "Condivisione aperta.";
  }
  await navigator.clipboard.writeText(fallback);
  return "Copiato negli appunti.";
}

export function AccessSharePanel({ code, accessUrl }: AccessSharePanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const qrLinkSrc = `/api/admin/qr?text=${encodeURIComponent(accessUrl)}`;
  const qrCodeSrc = `/api/admin/qr?text=${encodeURIComponent(code)}`;

  async function handleShareLink() {
    const result = await shareOrCopy(
      { title: "Link accesso", text: `Link accesso: ${accessUrl}`, url: accessUrl },
      accessUrl,
    ).catch(() => "Condivisione non riuscita.");
    setMessage(result);
  }

  async function handleShareCode() {
    const result = await shareOrCopy(
      { title: "Codice accesso", text: `Codice accesso: ${code}` },
      code,
    ).catch(() => "Condivisione non riuscita.");
    setMessage(result);
  }

  return (
    <div className="grid gap-4 border-t border-surface-border pt-4 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">Codice QR link</span>
        <div className="flex items-center gap-4">
          {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrLinkSrc} alt="Codice QR del link" className="h-28 w-28 rounded-lg bg-white p-2" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
            >
              <Share2 size={16} aria-hidden="true" />
              Condividi link
            </button>
            <CopyButton value={accessUrl} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">Codice QR codice</span>
        <div className="flex items-center gap-4">
          {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeSrc} alt="Codice QR del codice" className="h-28 w-28 rounded-lg bg-white p-2" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShareCode}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
            >
              <Share2 size={16} aria-hidden="true" />
              Condividi codice
            </button>
            <CopyButton value={code} />
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-muted md:col-span-2">{message}</p>}
    </div>
  );
}
