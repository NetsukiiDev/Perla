"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const AUTO_DISMISS_MS = 10_000;
const POPOVER_WIDTH = 260;
const VIEWPORT_MARGIN = 12;
// Below this much space, prefer flipping the popover above the button
// instead — a rough estimate of its own height (message + button row +
// padding), not pixel-precise, just enough to pick the right side.
const MIN_SPACE_BELOW = 160;

interface Position {
  left: number;
  // Anchored via exactly one of these — `bottom` (not `top`) when flipped
  // above the button, so the popover grows upward as its content wraps
  // instead of needing to know its height up front.
  top?: number;
  bottom?: number;
}

// A floating confirmation popover instead of window.confirm() — native
// dialogs are unreliable across browsers/embedded webviews (silently
// auto-dismissed or blocked). An earlier version of this component fixed
// that with a two-tap icon (tap once to "arm" it, tap again within a few
// seconds to confirm) — but the confirm message only ever lived in a
// title/aria-label attribute: invisible on touch (no hover to trigger it)
// and easy to miss on desktop. A user who paused to actually read what
// they were confirming just found the button silently reset, since the
// pause blew past the old 4s auto-disarm — indistinguishable from the
// button doing nothing at all. This shows the message as real on-page
// text with explicit Conferma/Annulla buttons, rendered through a portal
// so it always floats above an ancestor's `overflow-x-auto` (e.g. the
// admin tables' horizontal-scroll wrapper) instead of being clipped by it.
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
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }

  function openPopover() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Right-aligned to the button by default (the common case: this is
    // usually the last/rightmost action in a row), clamped so it never
    // overflows either edge of the viewport — important on a phone width.
    const left = Math.min(
      Math.max(rect.right - POPOVER_WIDTH, VIEWPORT_MARGIN),
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // A delete button near the bottom of a short/small browser window (the
    // report that prompted this: "Elimina evento" in the event edit form,
    // popover opening downward, cut off by the window edge) needs the
    // popover to open upward instead — only when there's actually more
    // room that way, so a button near the very top doesn't flip needlessly.
    const openUpward = spaceBelow < MIN_SPACE_BELOW && spaceAbove > spaceBelow;
    setPosition(
      openUpward ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 },
    );
    setOpen(true);
    timerRef.current = setTimeout(close, AUTO_DISMISS_MS);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    // Scrolling (including the table's own horizontal overflow-x-auto) or
    // resizing would leave the popover's fixed position stale/misaligned —
    // simplest correct fix is to just close it rather than track a moving anchor.
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const buttonLabel = label ?? (typeof children === "string" ? children : confirmMessage);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        title={Icon ? buttonLabel : undefined}
        aria-label={Icon ? buttonLabel : undefined}
        aria-expanded={open}
        onClick={() => (open ? close() : openPopover())}
        className={className ?? (Icon ? iconButtonClass(variant) : "text-sm text-danger hover:underline disabled:opacity-50")}
      >
        {Icon ? (
          <>
            <Icon size={16} aria-hidden="true" />
            <span className="sr-only">{buttonLabel}</span>
          </>
        ) : (
          children
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            role="alertdialog"
            aria-label={confirmMessage}
            style={{
              position: "fixed",
              left: position.left,
              width: POPOVER_WIDTH,
              ...(position.top !== undefined ? { top: position.top } : { bottom: position.bottom }),
            }}
            className="z-50 rounded-lg border border-surface-border bg-surface p-3 text-left shadow-xl"
          >
            <p className="text-sm text-foreground">{confirmMessage}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  onConfirm();
                }}
                className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
