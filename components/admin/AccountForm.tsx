"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

export function AccountForm({ email }: { email: string }) {
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) {
      setError(t.account.errors.tooShort);
      return;
    }
    if (newPassword !== confirm) {
      setError(t.account.errors.notMatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setDone(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error === "wrong_password" ? t.account.errors.wrongPassword : t.account.errors.updateFailed);
    } catch {
      setError(t.account.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.account.email}</label>
        <input value={email} disabled className={`${inputClass} opacity-60`} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.account.currentPassword}</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.account.newPassword}</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.account.confirmPassword}</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm text-emerald-400">{t.account.success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        <KeyRound size={16} aria-hidden="true" />
        {loading ? "..." : t.account.updateButton}
      </button>
    </form>
  );
}
