"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  imageUrl: string | null;
}

const POLL_MS = 30_000;

export function AnnouncementsFeed() {
  const t = useT();
  const [items, setItems] = useState<Announcement[]>([]);

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
      <ul className="flex flex-col gap-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-lg border border-surface-border bg-surface/40 p-3">
            {a.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imageUrl} alt="" className="mb-2 w-full rounded-md border border-surface-border object-contain" />
            )}
            <p className="whitespace-pre-wrap text-sm text-foreground">{a.message}</p>
            <p className="mt-1 text-[11px] text-muted">{new Date(a.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
