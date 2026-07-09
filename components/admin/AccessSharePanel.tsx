"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { useT } from "@/lib/i18n/context";

interface AccessSharePanelProps {
  code: string;
  accessUrl: string;
}

  async function shareOrCopy(payload: ShareData, fallback: string, t: ReturnType<typeof useT>) {
    if (navigator.share) {
      await navigator.share(payload);
      return t.accessShare.success;
    }
    await navigator.clipboard.writeText(fallback);
    return t.accessShare.success;
  }

export function AccessSharePanel({ code, accessUrl }: AccessSharePanelProps) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const qrLinkSrc = `/api/admin/qr?text=${encodeURIComponent(accessUrl)}`;
  const qrCodeSrc = `/api/admin/qr?text=${encodeURIComponent(code)}`;

  async function handleShareLink() {
    const result = await shareOrCopy(
      { title: "Link accesso", text: `Link accesso: ${accessUrl}`, url: accessUrl },
      accessUrl,
      t,
    ).catch(() => t.accessShare.copyError);
    setMessage(result);
  }

  async function handleShareCode() {
    const result = await shareOrCopy(
      { title: "Codice accesso", text: `Codice accesso: ${code}` },
      code,
      t,
    ).catch(() => t.accessShare.copyError);
    setMessage(result);
  }

  return (
    <div className="grid gap-4 border-t border-surface-border pt-4 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">{t.accessShare.qrLink}</span>
        <div className="flex items-center gap-4">
          {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrLinkSrc} alt={t.accessShare.qrLink} className="h-28 w-28 rounded-lg bg-white p-2" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
            >
              <Share2 size={16} aria-hidden="true" />
              {t.accessShare.shareLink}
            </button>
            <CopyButton value={accessUrl} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">{t.accessShare.qrCode}</span>
        <div className="flex items-center gap-4">
          {/* Fixed-size QR from an internal endpoint — next/image gives no benefit here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeSrc} alt={t.accessShare.qrCode} className="h-28 w-28 rounded-lg bg-white p-2" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShareCode}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-muted hover:text-foreground"
            >
              <Share2 size={16} aria-hidden="true" />
              {t.accessShare.shareCode}
            </button>
            <CopyButton value={code} />
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-muted md:col-span-2">{message}</p>}
    </div>
  );
}
