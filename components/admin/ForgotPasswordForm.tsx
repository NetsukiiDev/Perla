"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError(t.login.forgotPassword.errors.rateLimited);
        return;
      }
      if (!res.ok && res.status !== 400) {
        setError(t.login.forgotPassword.errors.generic);
        return;
      }
      // Always show the same confirmation (no user enumeration).
      setSent(true);
    } catch {
      setError(t.login.forgotPassword.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {t.login.forgotPassword.sent}
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1 self-start text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={14} aria-hidden="true" /> {t.login.forgotPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.login.forgotPassword.description}</p>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.login.forgotPassword.email}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} aria-hidden="true" />}
        {loading ? t.login.forgotPassword.submitting : t.login.forgotPassword.submit}
      </button>
      <Link
        href="/admin/login"
        className="inline-flex items-center gap-1 self-start text-sm text-blue-400 hover:text-blue-300"
      >
        <ArrowLeft size={14} aria-hidden="true" /> {t.login.forgotPassword.backToLogin}
      </Link>
    </form>
  );
}
