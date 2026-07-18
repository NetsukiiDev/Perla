"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, Server } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

interface SmtpState {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

const EMPTY: SmtpState = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
  fromName: "",
  fromEmail: "",
  enabled: false,
};

export function SmtpSettingsForm() {
  const t = useT();
  const [form, setForm] = useState<SmtpState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDone, setTestDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/smtp");
        if (res.ok) {
          const data = await res.json();
          if (data.configured) {
            if (!cancelled) {
              setForm({
                host: data.host ?? "",
                port: data.port ?? 587,
                secure: Boolean(data.secure),
                user: data.user ?? "",
                password: "",
                fromName: data.fromName ?? "",
                fromEmail: data.fromEmail ?? "",
                enabled: Boolean(data.enabled),
              });
            }
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

  function update<K extends keyof SmtpState>(key: K, value: SmtpState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!form.host || !form.port || !form.fromEmail) {
      setError(t.settings.smtp.errors.invalid);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          secure: form.secure,
          user: form.user || null,
          password: form.password || null,
          fromName: form.fromName || null,
          fromEmail: form.fromEmail,
          enabled: form.enabled,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        setError(t.settings.smtp.errors.saveFailed);
      }
    } catch {
      setError(t.settings.smtp.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setError(null);
    setTestDone(false);
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) setTestDone(true);
      else {
        const body = await res.json().catch(() => null);
        if (body?.error === "decrypt_failed") {
          setError(t.settings.smtp.errors.decryptFailed);
        } else {
          const detail = body?.detail;
          setError(detail ? t.settings.smtp.errors.testError.replace("{error}", detail) : t.settings.smtp.errors.testFailed);
        }
      }
    } catch {
      setError(t.settings.smtp.errors.testFailed);
    } finally {
      setTesting(false);
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
    <form onSubmit={handleSave} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.settings.smtp.host}</label>
        <input
          className={inputClass}
          value={form.host}
          onChange={(e) => update("host", e.target.value)}
          placeholder="smtp.example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.smtp.port}</label>
          <input
            type="number"
            className={inputClass}
            value={form.port}
            onChange={(e) => update("port", Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.smtp.user}</label>
          <input className={inputClass} value={form.user} onChange={(e) => update("user", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.secure} onChange={(e) => update("secure", e.target.checked)} />
        {t.settings.smtp.secure}
      </label>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.settings.smtp.password}</label>
        <input
          type="password"
          className={inputClass}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.smtp.fromName}</label>
          <input className={inputClass} value={form.fromName} onChange={(e) => update("fromName", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.smtp.fromEmail}</label>
          <input
            type="email"
            className={inputClass}
            value={form.fromEmail}
            onChange={(e) => update("fromEmail", e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(e) => update("enabled", e.target.checked)} />
        {t.settings.smtp.enabled}
      </label>
      <p className="text-xs text-muted">{t.settings.smtp.enabledHint}</p>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">{t.settings.smtp.saved}</p>}
      {testDone && <p className="text-sm text-emerald-400">{t.settings.smtp.testSent}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} aria-hidden="true" />}
          {saving ? t.settings.smtp.saving : t.settings.smtp.save}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !form.enabled}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} aria-hidden="true" />}
          {testing ? t.settings.smtp.sendingTest : t.settings.smtp.sendTest}
        </button>
      </div>
    </form>
  );
}
