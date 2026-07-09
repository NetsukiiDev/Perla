"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { iconButtonClass } from "./IconButton";
import { useT } from "@/lib/i18n/context";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      title={copied ? t.common.copied : t.common.copy}
      aria-label={copied ? t.common.copied : t.common.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={className ?? iconButtonClass(copied ? "primary" : "neutral")}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{copied ? t.common.copied : t.common.copy}</span>
    </button>
  );
}
