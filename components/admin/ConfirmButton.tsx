"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { iconButtonClass } from "./IconButton";
import { useT } from "@/lib/i18n/context";

interface ConfirmButtonProps {
  confirmMessage: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  label?: string;
  variant?: "neutral" | "danger";
  children: React.ReactNode;
}

const CONFIRM_TIMEOUT_MS = 4000;

// Two-step inline confirmation instead of window.confirm() — native dialogs
// are unreliable across browsers/embedded webviews (silently auto-dismissed
// or blocked, with no error thrown), which made every destructive action
// using this component look like a dead button: click it, and apparently
// nothing happens. First click arms it (visibly, via a filled danger
// state); a second click within a few seconds actually confirms. Clicking
// elsewhere, or waiting past the timeout, disarms it again.
export function ConfirmButton({
  confirmMessage,
  onConfirm,
  className,
  disabled,
  icon: Icon,
  label,
  variant = "danger",
  children,
}: ConfirmButtonProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function disarm() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
  }

  function handleClick() {
    if (confirming) {
      disarm();
      onConfirm();
      return;
    }
    setConfirming(true);
    timerRef.current = setTimeout(disarm, CONFIRM_TIMEOUT_MS);
  }

  const buttonLabel = label ?? (typeof children === "string" ? children : confirmMessage);
  const confirmLabel = `${t.common.confirm}? ${confirmMessage}`;

  return (
    <button
      type="button"
      disabled={disabled}
      title={confirming ? confirmLabel : Icon ? buttonLabel : undefined}
      aria-label={confirming ? confirmLabel : Icon ? buttonLabel : undefined}
      onClick={handleClick}
      onBlur={disarm}
      className={
        className ??
        (Icon
          ? confirming
            ? variant === "danger"
              ? "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger bg-danger text-white transition-colors disabled:opacity-50"
              : "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent bg-accent text-accent-foreground transition-colors disabled:opacity-50"
            : iconButtonClass(variant)
          : confirming
            ? "text-sm font-medium text-danger underline disabled:opacity-50"
            : "text-sm text-danger hover:underline disabled:opacity-50")
      }
    >
      {Icon ? (
        <>
          <Icon size={16} aria-hidden="true" />
          <span className="sr-only">{confirming ? confirmLabel : buttonLabel}</span>
        </>
      ) : confirming ? (
        t.common.confirm
      ) : (
        children
      )}
    </button>
  );
}
