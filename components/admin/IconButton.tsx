"use client";

import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type IconButtonVariant = "neutral" | "primary" | "danger";

export function iconButtonClass(variant: IconButtonVariant = "neutral"): string {
  const base =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-colors disabled:opacity-50";
  if (variant === "primary") {
    return `${base} border-accent bg-accent text-accent-foreground hover:opacity-90`;
  }
  if (variant === "danger") {
    return `${base} border-danger/40 bg-danger/10 text-danger hover:border-danger hover:bg-danger/15`;
  }
  return `${base} border-surface-border bg-background text-muted hover:border-foreground hover:text-foreground`;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: IconButtonVariant;
}

export function IconButton({ icon: Icon, label, variant = "neutral", className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={className ?? iconButtonClass(variant)}
      {...props}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
