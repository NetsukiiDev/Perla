// Warning shown on event pages when the event is not active: its codes
// return "Codice non disponibile" to participants until it goes live.
export function EventInactiveNotice({ status }: { status: string }) {
  if (status === "active") return null;

  const reason =
    status === "closed" || status === "archived"
      ? "L'evento è chiuso: i codici non sono più utilizzabili."
      : "L'evento non è ancora attivo: i codici mostreranno “Codice non disponibile” finché non lo attivi.";

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
      {reason}
    </div>
  );
}
