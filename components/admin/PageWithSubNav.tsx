"use client";

import type { ReactNode } from "react";
import { EventSubNav } from "./EventSubNav";
import { AdminContainer } from "./AdminContainer";
import { useNavLayout } from "@/lib/use-nav-layout";

type TabKey = "overview" | "edit" | "participants" | "tickets" | "live";

export function PageWithSubNav({
  eventId,
  activeTab,
  header,
  children,
}: {
  eventId: string;
  activeTab: TabKey;
  header?: ReactNode;
  children: ReactNode;
}) {
  const { navLayout } = useNavLayout();

  if (navLayout === "sidebar") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="flex gap-6">
          <aside className="w-48 shrink-0">
            <EventSubNav eventId={eventId} active={activeTab} vertical />
          </aside>
          <div className="min-w-0 flex-1">
            {header}
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContainer>
      {header}
      <EventSubNav eventId={eventId} active={activeTab} />
      {children}
    </AdminContainer>
  );
}
