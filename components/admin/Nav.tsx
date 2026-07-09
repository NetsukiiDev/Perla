"use client";

import Link from "next/link";
import { CalendarDays, LogOut, Settings, UserCircle, Users } from "lucide-react";
import { IconButton } from "./IconButton";
import { useT } from "@/lib/i18n/context";

export function Nav({ role }: { role: "admin" | "staff" }) {
  const t = useT();

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
            {t.nav.events}
          </Link>
          {role === "admin" && (
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-muted hover:text-foreground">
              <Users size={16} aria-hidden="true" />
              {t.nav.users}
            </Link>
          )}
          <Link href="/admin/account" className="inline-flex items-center gap-2 text-muted hover:text-foreground">
            <UserCircle size={16} aria-hidden="true" />
            {t.nav.account}
          </Link>
          <Link href="/admin/settings" className="inline-flex items-center gap-2 text-muted hover:text-foreground">
            <Settings size={16} aria-hidden="true" />
            {t.nav.settings}
          </Link>
        </nav>
        <IconButton icon={LogOut} label={t.nav.logout} onClick={handleLogout} />
      </div>
    </header>
  );
}
