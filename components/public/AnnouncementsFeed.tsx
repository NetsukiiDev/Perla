"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  imageUrl: string | null;
}

const POLL_MS = 30_000;

export function AnnouncementsFeed() {
  const t = useT();
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch("/api/session/announcements");
        if (!cancelled && res.ok) setItems((await res.json()).announcements);
      } catch {
        /* ignore */
      }
    }

    load();
    timer = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Megaphone size={14} aria-hidden="true" />
        {t.announcements.feedTitle}
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface/40 p-3"
          >
            <div className="min-w-0">
              {a.title && <p className="truncate text-sm font-medium text-foreground">{a.title}</p>}
              <p className="mt-0.5 text-[11px] text-muted">{new Date(a.createdAt).toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(a)}
              className="shrink-0 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground"
            >
              {t.announcements.open}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {open.title && <h2 className="font-semibold text-foreground">{open.title}</h2>}
                <p className="mt-0.5 text-[11px] text-muted">{new Date(open.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                title={t.announcements.close}
                aria-label={t.announcements.close}
                onClick={() => setOpen(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-border text-muted hover:border-foreground hover:text-foreground"
              >
                <X size={16} aria-hidden="true" />
                <span className="sr-only">{t.announcements.close}</span>
              </button>
            </div>
            {open.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={open.imageUrl}
                alt=""
                className="mb-3 mx-auto max-h-80 w-auto max-w-full rounded-md border border-surface-border object-contain"
              />
            )}
            <p className="whitespace-pre-wrap text-sm text-foreground">{open.message}</p>
          </div>
        </div>
      )}
    </section>
  );
}
