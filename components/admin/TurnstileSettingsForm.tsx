"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useT } from "@/lib/i18n/context";
import { Loader2 } from "lucide-react";

type Config = {
  configured: true;
  siteKey: string;
  hasSecretKey: boolean;
  enabled: boolean;
} | { configured: false };

export function TurnstileSettingsForm() {
  const t = useT();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/turnstile");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setCfg(data);
            if (data.configured) {
              setSiteKey(data.siteKey);
              setEnabled(data.enabled);
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/turnstile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteKey, secretKey, enabled }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ ok: true, text: t.settings.turnstile.saved });
        setSecretKey("");
      } else {
        setMessage({ ok: false, text: t.settings.turnstile.errors.saveFailed });
      }
    } catch {
      setMessage({ ok: false, text: t.settings.turnstile.errors.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="turnstile-sitekey" className="text-xs uppercase tracking-wide text-muted">
          {t.settings.turnstile.siteKeyLabel}
        </label>
        <input
          id="turnstile-sitekey"
          type="text"
          value={siteKey}
          onChange={(e) => setSiteKey(e.target.value)}
          required
          placeholder="0x4AAAAAAA..."
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
        <p className="text-[11px] text-muted">{t.settings.turnstile.siteKeyHint}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="turnstile-secretkey" className="text-xs uppercase tracking-wide text-muted">
          {t.settings.turnstile.secretKeyLabel}
        </label>
        <input
          id="turnstile-secretkey"
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder={cfg?.configured && cfg.hasSecretKey ? "••••••••" : ""}
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
        <p className="text-[11px] text-muted">
          {t.settings.turnstile.secretKeyHint}
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-surface-border accent-accent"
        />
        <span className="text-sm">{t.settings.turnstile.enabledLabel}</span>
      </label>

      {message && (
        <p className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? t.settings.turnstile.saving : t.settings.turnstile.save}
      </button>
    </form>
  );
}
