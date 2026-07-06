import { ERROR_MESSAGES } from "@/lib/constants";

const CODE_ERROR_MESSAGES: Record<string, string> = {
  already_used: ERROR_MESSAGES.ALREADY_USED,
  invalid: ERROR_MESSAGES.INVALID_CODE,
  not_available: ERROR_MESSAGES.CODE_NOT_AVAILABLE,
  rate_limited: "Troppi tentativi. Riprova tra qualche minuto.",
};

export function CodeEntryForm({ error, defaultCode }: { error?: string; defaultCode?: string }) {
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
        placeholder="Inserisci codice"
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
        Continua
      </button>
    </form>
  );
}
