"use client";

import type { LucideIcon } from "lucide-react";
import { iconButtonClass } from "./IconButton";

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

// Native confirm() is enough to satisfy "confirm before removing or
// revoking" without building a custom modal for every destructive action.
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
  const buttonLabel = label ?? (typeof children === "string" ? children : confirmMessage);
  return (
    <button
      type="button"
      disabled={disabled}
      title={Icon ? buttonLabel : undefined}
      aria-label={Icon ? buttonLabel : undefined}
      onClick={() => {
        if (window.confirm(confirmMessage)) onConfirm();
      }}
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
  );
}
