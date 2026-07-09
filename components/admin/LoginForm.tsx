"use client";

import { useState, useRef, type FormEvent } from "react";
import { useT } from "@/lib/i18n/context";
import { TurnstileWidget } from "./TurnstileWidget";
import { Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, (t: ReturnType<typeof useT>) => string> = {
  invalid: (t) => t.login.errors.invalid,
  rate_limited: (t) => t.login.errors.rateLimit,
  captcha_failed: (t) => t.login.errors.captchaFailed,
};

export function LoginForm({ nextPath, error }: { nextPath: string; error?: string }) {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  // Whether Turnstile is enabled (reported by the widget). When disabled, no
  // CAPTCHA token is required and the form must stay submittable.
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const message = error ? ERROR_MESSAGES[error]?.(t) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (turnstileEnabled && !token) return;
    setLoading(true);

    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    if (token) formData.set("cf-turnstile-response", token);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        body: formData,
      });
      if (res.redirected) {
        window.location.assign(res.url);
      } else {
        const data = await res.json();
        if (data.ok) {
          window.location.assign(nextPath);
        } else {
          window.location.assign(`/admin/login?error=${data.error}`);
        }
      }
    } catch {
      window.location.assign("/admin/login?error=invalid");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-email" className="text-xs uppercase tracking-wide text-muted">
          {t.login.email}
        </label>
        <input
          id="admin-email"
          type="email"
          name="email"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className="text-xs uppercase tracking-wide text-muted">
          {t.login.password}
        </label>
        <input
          id="admin-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      <TurnstileWidget onToken={setToken} onStatus={setTurnstileEnabled} />
      {message && <p className="text-sm text-danger">{message}</p>}
      <button
        type="submit"
        disabled={loading || (turnstileEnabled && !token)}
        className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? t.settings.version.checking : t.login.loginButton}
      </button>
      <a
        href="/admin/forgot-password"
        className="self-end text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        {t.login.forgotPasswordLink}
      </a>
    </form>
  );
}
