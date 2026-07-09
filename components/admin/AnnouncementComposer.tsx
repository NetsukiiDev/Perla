"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Megaphone, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  imageUrl: string | null;
}

const MAX_IMAGE_FILE = 2 * 1024 * 1024;

export function AnnouncementComposer({ eventId }: { eventId: string }) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Announcement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadRecent() {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/announcements`);
      if (res.ok) setRecent((await res.json()).announcements);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadRecent();
  }, [eventId]);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_FILE) {
      setError(t.announcements.errors.imageTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!message.trim()) {
      setError(t.announcements.errors.messageRequired);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, image }),
      });
      if (res.ok) {
        setMessage("");
        setImage(null);
        await loadRecent();
      } else if (res.status === 413) {
        setError(t.announcements.errors.imageTooLarge);
      } else {
        setError(t.announcements.errors.generic);
      }
    } catch {
      setError(t.announcements.errors.generic);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t.announcements.composerTitle}</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-message" className="text-xs uppercase tracking-wide text-muted">
            {t.announcements.messageLabel}
          </label>
          <textarea
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={t.announcements.messagePlaceholder}
            className="w-full resize-y rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">{t.announcements.imageLabel}</span>
          {image ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="max-h-48 rounded-lg border border-surface-border object-contain" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label={t.announcements.removeImage}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-surface-border bg-background/90 text-muted hover:text-foreground"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="self-start rounded-lg border border-dashed border-surface-border px-4 py-2.5 text-sm text-muted hover:text-foreground"
            >
              {t.announcements.changeImage}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {sending && <Loader2 size={16} className="animate-spin" />}
          <Megaphone size={16} aria-hidden="true" />
          {sending ? t.announcements.sending : t.announcements.send}
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t.announcements.recent}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">{t.announcements.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((a) => (
              <li key={a.id} className="rounded-lg border border-surface-border p-3">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" className="mb-2 max-h-56 w-full rounded-md border border-surface-border object-contain" />
                )}
                <p className="whitespace-pre-wrap text-sm text-foreground">{a.message}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
