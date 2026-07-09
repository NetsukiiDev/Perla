"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

const ERROR_KEYS = {
  invalid: "invalid",
  not_match: "notMatch",
  invalid_token: "invalid",
  expired: "expired",
  generic: "generic",
} as const;

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const errorText = (code: string): string => {
    const key = (code in ERROR_KEYS ? ERROR_KEYS[code as keyof typeof ERROR_KEYS] : "generic") as
      | "invalid"
      | "notMatch"
      | "expired"
      | "generic";
    return t.login.resetPassword.errors[key];
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError(t.login.resetPassword.errors.tooShort);
      return;
    }
    if (newPassword !== confirm) {
      setError(t.login.resetPassword.errors.notMatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword: confirm }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.error === "not_match") {
        setError(t.login.resetPassword.errors.notMatch);
      } else {
        setError(errorText(data?.error ?? "generic"));
      }
    } catch {
      setError(t.login.resetPassword.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {t.login.resetPassword.invalidToken}
        </p>
        <Link
          href="/admin/forgot-password"
          className="inline-flex items-center gap-1 self-start text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={14} aria-hidden="true" /> {t.login.forgotPassword.backToLogin}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {t.login.resetPassword.success}
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1 self-start text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={14} aria-hidden="true" /> {t.login.resetPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.login.resetPassword.description}</p>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.login.resetPassword.newPassword}</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.login.resetPassword.confirmPassword}</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} aria-hidden="true" />}
        {loading ? t.login.resetPassword.submitting : t.login.resetPassword.submit}
      </button>
    </form>
  );
}
