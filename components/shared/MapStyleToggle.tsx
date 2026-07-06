"use client";

import { type MapStyle } from "./MapsTileLayer";

interface MapStyleToggleProps {
  style: MapStyle;
  onChange: (style: MapStyle) => void;
}

export function MapStyleToggle({ style, onChange }: MapStyleToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(style === "dark" ? "satellite" : "dark")}
      className="rounded-md border border-surface-border bg-background px-2.5 py-1 text-xs text-muted hover:text-foreground"
      title={style === "dark" ? "Attiva satellite" : "Attiva scuro"}
    >
      {style === "dark" ? "Satellite" : "Mappa"}
    </button>
  );
}
