"use client";

import Link from "next/link";
import { CalendarDays, LogOut, UserCircle, Users } from "lucide-react";
import { IconButton } from "./IconButton";

export function Nav({ role }: { role: "admin" | "staff" }) {
  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin/events" className="inline-flex items-center gap-2 font-medium tracking-wide text-foreground">
            <CalendarDays size={16} aria-hidden="true" />
            Eventi
          </Link>
          {role === "admin" && (
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-muted hover:text-foreground">
              <Users size={16} aria-hidden="true" />
              Utenti
            </Link>
          )}
          <Link href="/admin/account" className="inline-flex items-center gap-2 text-muted hover:text-foreground">
            <UserCircle size={16} aria-hidden="true" />
            Account
          </Link>
        </nav>
        <IconButton icon={LogOut} label="Esci" onClick={handleLogout} />
      </div>
    </header>
  );
}
