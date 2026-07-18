"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Radio, Square } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { CopyButton } from "@/components/admin/CopyButton";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

const STATUS_POLL_MS = 5_000;

interface NgrokState {
  authtoken: string;
  domain: string;
}

const EMPTY: NgrokState = { authtoken: "", domain: "" };

export function NgrokSettingsForm() {
  const t = useT();
  const [form, setForm] = useState<NgrokState>(EMPTY);
  const [hasAuthtoken, setHasAuthtoken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [running, setRunning] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/ngrok");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.configured) {
            setForm({ authtoken: "", domain: data.domain ?? "" });
            setHasAuthtoken(Boolean(data.hasAuthtoken));
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/settings/ngrok/status");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setRunning(Boolean(data.running));
          setUrl(data.url ?? null);
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const timer = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function update<K extends keyof NgrokState>(key: K, value: NgrokState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/ngrok", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authtoken: form.authtoken || null, domain: form.domain || null }),
      });
      if (res.ok) {
        setSaved(true);
        if (form.authtoken) setHasAuthtoken(true);
        setForm((prev) => ({ ...prev, authtoken: "" }));
      } else {
        setError(t.settings.ngrok.errors.saveFailed);
      }
    } catch {
      setError(t.settings.ngrok.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/admin/settings/ngrok/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRunning(true);
        setUrl(data.url ?? null);
      } else if (data.error === "not_configured") {
        setError(t.settings.ngrok.errors.notConfigured);
      } else if (data.error === "vercel_unsupported") {
        setError(t.settings.ngrok.errors.vercelUnsupported);
      } else if (data.error === "decrypt_failed") {
        setError(t.settings.ngrok.errors.decryptFailed);
      } else if (!data.error) {
        setError(t.settings.ngrok.errors.startFailed);
      } else {
        setError(t.settings.ngrok.errors.startFailedWithDetail.replace("{error}", data.error));
      }
    } catch {
      setError(t.settings.ngrok.errors.startFailed);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await fetch("/api/admin/settings/ngrok/stop", { method: "POST" });
    } finally {
      setRunning(false);
      setUrl(null);
      setStopping(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.ngrok.authtokenLabel}</label>
          <input
            type="password"
            className={inputClass}
            value={form.authtoken}
            onChange={(e) => update("authtoken", e.target.value)}
            placeholder={hasAuthtoken ? "••••••••" : ""}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">{t.settings.ngrok.authtokenHint}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.ngrok.domainLabel}</label>
          <input
            className={inputClass}
            value={form.domain}
            onChange={(e) => update("domain", e.target.value)}
            placeholder={t.settings.ngrok.domainPlaceholder}
          />
          <p className="text-xs text-muted">{t.settings.ngrok.domainHint}</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-emerald-400">{t.settings.ngrok.saved}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {saving ? t.settings.ngrok.saving : t.settings.ngrok.save}
        </button>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border border-surface-border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${running ? "bg-emerald-400" : "bg-muted"}`} aria-hidden="true" />
            {running ? t.settings.ngrok.running : t.settings.ngrok.stopped}
          </span>
          {running ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {stopping ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Square size={14} aria-hidden="true" />}
              {stopping ? t.settings.ngrok.stopping : t.settings.ngrok.stop}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || !hasAuthtoken}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {starting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Radio size={14} aria-hidden="true" />}
              {starting ? t.settings.ngrok.starting : t.settings.ngrok.start}
            </button>
          )}
        </div>
        {!hasAuthtoken && <p className="text-xs text-muted">{t.settings.ngrok.notConfigured}</p>}
        {url && (
          <div className="flex flex-col gap-1">
            <span className={labelClass}>{t.settings.ngrok.urlLabel}</span>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-blue-400 hover:text-blue-300">
                {url}
              </a>
              <CopyButton value={url} />
            </div>
            <p className="text-xs text-muted">{t.settings.ngrok.shareHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
