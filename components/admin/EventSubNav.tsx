"use client";

import Link from "next/link";
import { Activity, LayoutDashboard, Pencil, Ticket, Users } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type TabKey = "overview" | "edit" | "participants" | "tickets" | "live";

export function EventSubNav({ eventId, active }: { eventId: string; active: TabKey }) {
  const t = useT();

  const labelMap: Record<TabKey, string> = {
    overview: t.events.subnav.overview,
    edit: t.events.subnav.edit,
    participants: t.events.subnav.participants,
    tickets: t.events.subnav.tickets,
    live: "Live",
  };

  const iconMap: Record<TabKey, typeof LayoutDashboard> = {
    overview: LayoutDashboard,
    edit: Pencil,
    participants: Users,
    tickets: Ticket,
    live: Activity,
  };

  const hrefMap: Record<TabKey, (id: string) => string> = {
    overview: (id: string) => `/admin/events/${id}`,
    edit: (id: string) => `/admin/events/${id}/edit`,
    participants: (id: string) => `/admin/events/${id}/participants`,
    tickets: (id: string) => `/admin/events/${id}/tickets`,
    live: (id: string) => `/admin/events/${id}/live`,
  };

  return (
    <nav className="mb-6 flex gap-4 border-b border-surface-border text-sm">
      {Object.keys(labelMap).map((key) => {
        const tabKey = key as TabKey;
        const Icon = iconMap[tabKey];
        return (
          <Link
            key={tabKey}
            href={hrefMap[tabKey](eventId)}
            className={`inline-flex items-center gap-2 border-b-2 pb-2 ${
              active === tabKey
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {labelMap[tabKey]}
          </Link>
        );
      })}
    </nav>
  );
}
