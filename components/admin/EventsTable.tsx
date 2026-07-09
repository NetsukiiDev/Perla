"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Eye, Pencil, Trash2, Users } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ConfirmButton } from "./ConfirmButton";
import { iconButtonClass } from "./IconButton";
import { useT } from "@/lib/i18n/context";

interface EventRow {
  id: string;
  internalName: string;
  region: string;
  status: string;
  startsAt: string;
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const t = useT();

  async function handleDelete(id: string) {
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted">{t.events.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">{t.events.table.name}</th>
            <th className="px-4 py-3">{t.events.table.region}</th>
            <th className="px-4 py-3">{t.events.table.status}</th>
            <th className="px-4 py-3">{t.events.table.start}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-surface-border last:border-0">
              <td className="px-4 py-3">
                <Link href={`/admin/events/${event.id}`} className="hover:underline">
                  {event.internalName}
                </Link>
              </td>
              <td className="px-4 py-3">{event.region}</td>
              <td className="px-4 py-3">
                <StatusBadge value={event.status} label={t.events.statusOptions[event.status as keyof typeof t.events.statusOptions] ?? event.status} />
              </td>
              <td className="px-4 py-3 text-muted">{new Date(event.startsAt).toLocaleString("it-IT")}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/events/${event.id}`}
                    title={t.events.subnav.overview}
                    aria-label={t.events.subnav.overview}
                    className={iconButtonClass()}
                  >
                    <Eye size={16} aria-hidden="true" />
                    <span className="sr-only">{t.events.subnav.overview}</span>
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/participants`}
                    title={t.events.subnav.participants}
                    aria-label={t.events.subnav.participants}
                    className={iconButtonClass()}
                  >
                    <Users size={16} aria-hidden="true" />
                    <span className="sr-only">{t.events.subnav.participants}</span>
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/live`}
                    title="Live"
                    aria-label="Live"
                    className={iconButtonClass()}
                  >
                    <Activity size={16} aria-hidden="true" />
                    <span className="sr-only">Live</span>
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                    className={iconButtonClass()}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    <span className="sr-only">{t.common.edit}</span>
                  </Link>
                  <ConfirmButton
                    confirmMessage={t.events.form.confirmDelete.replace("{name}", event.internalName)}
                    onConfirm={() => handleDelete(event.id)}
                    icon={Trash2}
                    label={t.common.delete}
                  >
                    {t.common.delete}
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
