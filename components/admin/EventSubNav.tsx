import Link from "next/link";
import { Activity, LayoutDashboard, Pencil, Ticket, Users } from "lucide-react";

const TABS = [
  { key: "overview", label: "Panoramica", icon: LayoutDashboard, href: (id: string) => `/admin/events/${id}` },
  { key: "edit", label: "Modifica", icon: Pencil, href: (id: string) => `/admin/events/${id}/edit` },
  { key: "participants", label: "Partecipanti", icon: Users, href: (id: string) => `/admin/events/${id}/participants` },
  { key: "tickets", label: "Biglietti", icon: Ticket, href: (id: string) => `/admin/events/${id}/tickets` },
  { key: "live", label: "Live", icon: Activity, href: (id: string) => `/admin/events/${id}/live` },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function EventSubNav({ eventId, active }: { eventId: string; active: TabKey }) {
  return (
    <nav className="mb-6 flex gap-4 border-b border-surface-border text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(eventId)}
          className={`inline-flex items-center gap-2 border-b-2 pb-2 ${
            active === tab.key
              ? "border-foreground text-foreground"
              : "border-transparent text-muted hover:border-foreground hover:text-foreground"
          }`}
        >
          <tab.icon size={16} aria-hidden="true" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
