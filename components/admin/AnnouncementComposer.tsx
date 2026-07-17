"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Megaphone, Pencil, Trash2, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { iconButtonClass } from "@/components/admin/IconButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  imageUrl: string | null;
}

const MAX_IMAGE_FILE = 2 * 1024 * 1024;

export function AnnouncementComposer({ eventId }: { eventId: string }) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  // undefined = leave the current image untouched (edit) / no image (create);
  // null = explicitly removed; a data URL = a newly picked image.
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    // Inlined so the state update happens after the awaited fetch, not
    // synchronously in the effect body. loadRecent() stays for manual refresh.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/announcements`);
        if (!cancelled && res.ok) setRecent((await res.json()).announcements);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
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

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setMessage(a.message);
    setImage(undefined);
    setExistingImageUrl(a.imageUrl);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setImage(undefined);
    setExistingImageUrl(null);
    setError(null);
  }

  async function send() {
    if (!title.trim()) {
      setError(t.announcements.errors.titleRequired);
      return;
    }
    if (!message.trim()) {
      setError(t.announcements.errors.messageRequired);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const payload: Record<string, unknown> = { title, message };
      if (image !== undefined) payload.image = image;
      const url = editingId
        ? `/api/admin/events/${eventId}/announcements/${editingId}`
        : `/api/admin/events/${eventId}/announcements`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        cancelEdit();
        await loadRecent();
      } else if (res.status === 413) {
        setError(t.announcements.errors.imageTooLarge);
      } else {
        setError(editingId ? t.announcements.errors.updateFailed : t.announcements.errors.generic);
      }
    } catch {
      setError(editingId ? t.announcements.errors.updateFailed : t.announcements.errors.generic);
    } finally {
      setSending(false);
    }
  }

  async function remove(a: Announcement) {
    setDeletingId(a.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/announcements/${a.id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === a.id) cancelEdit();
        await loadRecent();
      } else {
        setError(t.announcements.errors.deleteFailed);
      }
    } catch {
      setError(t.announcements.errors.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  const imagePreview = image ?? (image === undefined ? existingImageUrl : null);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{editingId ? t.announcements.editTitle : t.announcements.composerTitle}</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-title" className="text-xs uppercase tracking-wide text-muted">
            {t.announcements.titleLabel}
          </label>
          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.announcements.titlePlaceholder}
            className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
          />
        </div>

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
          {imagePreview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="" className="max-h-48 rounded-lg border border-surface-border object-contain" />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setExistingImageUrl(null);
                }}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {sending && <Loader2 size={16} className="animate-spin" />}
            <Megaphone size={16} aria-hidden="true" />
            {sending ? (editingId ? t.announcements.saving : t.announcements.sending) : editingId ? t.announcements.save : t.announcements.send}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={sending}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {t.announcements.cancel}
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t.announcements.recent}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">{t.announcements.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((a) => (
              <li
                key={a.id}
                className={`rounded-lg border p-3 ${a.id === editingId ? "border-accent" : "border-surface-border"}`}
              >
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imageUrl}
                    alt=""
                    className="mb-3 mx-auto max-h-56 w-auto max-w-full rounded-md border border-surface-border object-contain"
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {a.title && <p className="truncate text-sm font-semibold text-foreground">{a.title}</p>}
                    <p className="mt-0.5 text-[11px] text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title={t.announcements.edit}
                      aria-label={t.announcements.edit}
                      onClick={() => startEdit(a)}
                      className={iconButtonClass("neutral")}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <ConfirmButton
                      confirmMessage={t.announcements.confirmDelete}
                      onConfirm={() => remove(a)}
                      disabled={deletingId === a.id}
                      icon={Trash2}
                      label={t.announcements.delete}
                      variant="danger"
                    >
                      {t.announcements.delete}
                    </ConfirmButton>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
