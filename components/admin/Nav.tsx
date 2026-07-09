"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, LogOut, Menu, Settings, UserCircle, Users, X } from "lucide-react";
import { IconButton } from "./IconButton";
import { useT } from "@/lib/i18n/context";

export function Nav({ role }: { role: "admin" | "staff" }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  const links = [
    { href: "/admin/events", label: t.nav.events, icon: CalendarDays },
    ...(role === "admin" ? [{ href: "/admin/users", label: t.nav.users, icon: Users }] : []),
    { href: "/admin/account", label: t.nav.account, icon: UserCircle },
    { href: "/admin/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin/events" className="inline-flex items-center gap-2 font-medium tracking-wide text-foreground">
          <CalendarDays size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{t.nav.events}</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex items-center gap-2 text-muted hover:text-foreground">
              <l.icon size={16} aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground sm:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <IconButton icon={LogOut} label={t.nav.logout} onClick={handleLogout} />
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-surface-border px-4 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-muted hover:bg-surface hover:text-foreground"
            >
              <l.icon size={18} aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
