"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Shield, Trash2, UserCog, UserPlus } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ConfirmButton } from "./ConfirmButton";
import { IconButton } from "./IconButton";
import { useT } from "@/lib/i18n/context";

interface AdminUserRow {
  id: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
}

const ROLE_LABELS: Record<string, (t: ReturnType<typeof useT>) => string> = { admin: (t) => t.users.form.admin, staff: (t) => t.users.form.staff };
const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";

export function UsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  currentUserId: string;
}) {
  const t = useT();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t.users.errors.passwordTooShort);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setUsers((prev) => [...prev, data.user]);
        setEmail("");
        setPassword("");
        setRole("staff");
        return;
      }
      setError(data?.error === "email_taken" ? t.users.errors.emailInUse : t.users.errors.createFailed);
    } catch {
      setError(t.users.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(id: string, newRole: "admin" | "staff") {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error === "last_admin" ? t.users.alerts.lastAdmin : t.users.alerts.operationFailed);
    }
  }

  async function resetPassword(id: string) {
    const pw = window.prompt(t.users.resetPrompt);
    if (!pw) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pw }),
    });
    if (res.ok) alert(t.users.alerts.passwordUpdated);
    else alert(t.users.alerts.passwordInvalid);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      alert(
        data?.error === "last_admin"
          ? t.users.alerts.lastAdmin
          : data?.error === "cannot_delete_self"
            ? t.users.alerts.selfDelete
            : t.users.alerts.operationFailed,
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">{t.users.form.email}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">{t.users.form.password}</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">{t.users.form.role}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "staff")} className={inputClass}>
            <option value="staff">{t.users.form.staff}</option>
            <option value="admin">{t.users.form.admin}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <UserPlus size={16} aria-hidden="true" />
          {t.users.form.createButton}
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">{t.users.table.email}</th>
              <th className="px-4 py-3">{t.users.table.role}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">
                  {u.email}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-muted">{t.users.you}</span>}
                </td>
                <td className="px-4 py-3">
                    <StatusBadge value={u.role} label={ROLE_LABELS[u.role](t)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <IconButton
                      icon={u.role === "admin" ? UserCog : Shield}
                      label={u.role === "admin" ? t.users.roleActions.makeStaff : t.users.roleActions.makeAdmin}
                      onClick={() => changeRole(u.id, u.role === "admin" ? "staff" : "admin")}
                    />
                    <IconButton icon={KeyRound} label={t.users.roleActions.resetPassword} onClick={() => resetPassword(u.id)} />
                    {u.id !== currentUserId && (
                      <ConfirmButton
                        confirmMessage={t.users.confirmDelete.replace("{email}", u.email)}
                        onConfirm={() => remove(u.id)}
                        icon={Trash2}
                        label={t.users.roleActions.delete}
                      >
                        {t.users.roleActions.delete}
                      </ConfirmButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
