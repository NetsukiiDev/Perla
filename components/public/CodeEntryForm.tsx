"use client";

import { useT } from "@/lib/i18n/context";

export function CodeEntryForm({ error, defaultCode }: { error?: string; defaultCode?: string }) {
  const t = useT();
  const CODE_ERROR_MESSAGES: Record<string, string> = {
    already_used: t.participantFlow.errors.alreadyUsed,
    invalid: t.participantFlow.errors.invalidCode,
    not_available: t.participantFlow.errors.codeNotAvailable,
    rate_limited: t.participantFlow.codeEntry.errors.rateLimit,
  };
  const message = error ? CODE_ERROR_MESSAGES[error] : null;

  return (
    <form action="/api/code/verify" method="post" className="flex flex-col gap-4">
      <input
        type="text"
        name="code"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={t.participantFlow.codeEntry.placeholder}
        defaultValue={defaultCode}
        required
        maxLength={64}
        className="w-full rounded-lg border border-surface-border bg-background px-4 py-3 text-center text-lg tracking-widest text-foreground placeholder:text-muted focus:border-foreground focus:outline-none"
      />
      {message && <p className="text-center text-sm text-danger">{message}</p>}
      <button
        type="submit"
        className="w-full rounded-lg bg-accent px-4 py-3 text-center font-medium text-accent-foreground transition-opacity"
      >
        {t.participantFlow.codeEntry.continue}
      </button>
    </form>
  );
}
