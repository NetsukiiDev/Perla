"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Shield, Trash2, UserCog, UserPlus } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ConfirmButton } from "./ConfirmButton";
import { IconButton } from "./IconButton";

interface AdminUserRow {
  id: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = { admin: "Admin", staff: "Staff" };
const inputClass = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground";

export function UsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  currentUserId: string;
}) {
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
      setError("La password deve avere almeno 8 caratteri.");
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
      setError(data?.error === "email_taken" ? "Email già in uso." : "Impossibile creare l'account.");
    } catch {
      setError("Si è verificato un errore. Riprova.");
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
      alert(data?.error === "last_admin" ? "Non puoi rimuovere l'ultimo admin." : "Operazione non riuscita.");
    }
  }

  async function resetPassword(id: string) {
    const pw = window.prompt("Nuova password (min 8 caratteri):");
    if (!pw) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pw }),
    });
    if (res.ok) alert("Password aggiornata.");
    else alert("Password non valida (min 8 caratteri) o operazione non riuscita.");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      alert(
        data?.error === "last_admin"
          ? "Non puoi eliminare l'ultimo admin."
          : data?.error === "cannot_delete_self"
            ? "Non puoi eliminare il tuo stesso account."
            : "Operazione non riuscita.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted">Password</label>
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
          <label className="text-xs uppercase tracking-wide text-muted">Ruolo</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "staff")} className={inputClass}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <UserPlus size={16} aria-hidden="true" />
          Crea account
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">
                  {u.email}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-muted">(tu)</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={u.role} label={ROLE_LABELS[u.role]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <IconButton
                      icon={u.role === "admin" ? UserCog : Shield}
                      label={u.role === "admin" ? "Rendi staff" : "Rendi admin"}
                      onClick={() => changeRole(u.id, u.role === "admin" ? "staff" : "admin")}
                    />
                    <IconButton icon={KeyRound} label="Reset password" onClick={() => resetPassword(u.id)} />
                    {u.id !== currentUserId && (
                      <ConfirmButton
                        confirmMessage={`Eliminare l'account ${u.email}?`}
                        onConfirm={() => remove(u.id)}
                        icon={Trash2}
                        label="Elimina account"
                      >
                        Elimina
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
