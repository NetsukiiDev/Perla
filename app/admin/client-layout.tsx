"use client";

import { NavLayoutProvider } from "@/lib/use-nav-layout";
import type { ReactNode } from "react";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <NavLayoutProvider>{children}</NavLayoutProvider>;
}
