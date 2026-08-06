"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ChevronRight, Eye, Pencil, Trash2, Users } from "lucide-react";
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

type T = ReturnType<typeof useT>;

function Actions({ event, t, onDelete }: { event: EventRow; t: T; onDelete: (id: string) => void }) {
  return (
    <>
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
      <Link href={`/admin/events/${event.id}/live`} title="Live" aria-label="Live" className={iconButtonClass()}>
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
        onConfirm={() => onDelete(event.id)}
        icon={Trash2}
        label={t.common.delete}
      >
        {t.common.delete}
      </ConfirmButton>
    </>
  );
}

function EventsList({ events, t, onDelete }: { events: EventRow[]; t: T; onDelete: (id: string) => void }) {
  return (
    <>
      {/* Mobile: one card per event — a 5-column table plus a row of action
          icons never fits a phone width without horizontal scrolling, which
          is how this looked broken (row actions scrolled off-screen). */}
      <div className="flex flex-col gap-3 md:hidden">
        {events.map((event) => (
          <div key={event.id} className="flex flex-col gap-3 rounded-lg border border-surface-border p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/events/${event.id}`} className="font-medium hover:underline">
                {event.internalName}
              </Link>
              <StatusBadge
                value={event.status}
                label={t.events.statusOptions[event.status as keyof typeof t.events.statusOptions] ?? event.status}
              />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <dt className="uppercase tracking-wide text-muted">{t.events.table.region}</dt>
                <dd>{event.region}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-muted">{t.events.table.start}</dt>
                <dd>{new Date(event.startsAt).toLocaleString("it-IT")}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-surface-border pt-3">
              <Actions event={event} t={t} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: the full table, unchanged. */}
      <div className="hidden overflow-x-auto rounded-lg border border-surface-border md:block">
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
                  <StatusBadge
                    value={event.status}
                    label={t.events.statusOptions[event.status as keyof typeof t.events.statusOptions] ?? event.status}
                  />
                </td>
                <td className="px-4 py-3 text-muted">{new Date(event.startsAt).toLocaleString("it-IT")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Actions event={event} t={t} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
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

  // Closed events are done — worth keeping around for history, but not
  // something you need to see every time you open the events list. Split
  // into their own collapsed-by-default section instead of mixing them in
  // with events that are still draft/scheduled/active.
  const openEvents = events.filter((e) => e.status !== "closed");
  const closedEvents = events.filter((e) => e.status === "closed");

  return (
    <div className="flex flex-col gap-6">
      {openEvents.length > 0 && <EventsList events={openEvents} t={t} onDelete={handleDelete} />}

      {closedEvents.length > 0 && (
        <details className="group rounded-lg border border-surface-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted hover:text-foreground">
            <ChevronRight size={16} className="shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
            {t.events.closedSection.replace("{count}", String(closedEvents.length))}
          </summary>
          {/* `hidden` + `group-open:block` rather than relying on the
              browser's native "hide non-summary children when closed"
              behavior — something in the global stylesheet overrides it, so
              a closed <details> was rendering its content anyway. */}
          <div className="hidden border-t border-surface-border p-4 group-open:block">
            <EventsList events={closedEvents} t={t} onDelete={handleDelete} />
          </div>
        </details>
      )}
    </div>
  );
}
