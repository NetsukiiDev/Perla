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
      <div className="mx-auto w-full max-w-5xl pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <aside className="w-full md:w-48 md:shrink-0">
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
