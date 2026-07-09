"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type NavLayout = "horizontal" | "sidebar";

const STORAGE_KEY = "eventNavLayout";

interface NavLayoutContextValue {
  navLayout: NavLayout;
  setNavLayout: (layout: NavLayout) => void;
}

const NavLayoutContext = createContext<NavLayoutContextValue | null>(null);

export function NavLayoutProvider({ children }: { children: ReactNode }) {
  const [navLayout, setNavLayoutState] = useState<NavLayout>("horizontal");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "sidebar" || stored === "horizontal") {
      setNavLayoutState(stored);
    }
  }, []);

  const setNavLayout = useCallback((layout: NavLayout) => {
    localStorage.setItem(STORAGE_KEY, layout);
    setNavLayoutState(layout);
  }, []);

  return (
    <NavLayoutContext.Provider value={{ navLayout, setNavLayout }}>
      {children}
    </NavLayoutContext.Provider>
  );
}

export function useNavLayout(): NavLayoutContextValue {
  const ctx = useContext(NavLayoutContext);
  if (!ctx) throw new Error("useNavLayout must be used within NavLayoutProvider");
  return ctx;
}
