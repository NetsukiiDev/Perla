// Cookie names, defaults, and the exact user-facing strings from the spec.
// Keep these centralized so every surface shows identical wording and no
// route accidentally leaks more detail than the spec allows.

export const ERROR_MESSAGES = {
  INVALID_CODE: "Codice non valido o non disponibile.",
  CODE_NOT_AVAILABLE: "Codice non disponibile.",
  ALREADY_USED: "Questo codice è già stato utilizzato.",
  LOCATION_DENIED: "Per visualizzare la posizione devi consentire l'accesso alla posizione.",
  ROUTE_COMPLETE: "Percorso completato.",
  GENERIC: "Si è verificato un errore. Riprova.",
} as const;

export const PRIVACY_NOTICE =
  "Useremo la tua posizione solo per mostrarti la prossima posizione da raggiungere e verificare l'arrivo alle tappe. I dati temporanei vengono eliminati dopo la chiusura dell'evento.";

export const STEP_HINT = "Raggiungi questo punto per ricevere la prossima posizione.";

export const COOKIE_NAMES = {
  CODE_REF: "code_ref",
  PARTICIPANT_SESSION: "participant_session",
  DEVICE_TOKEN: "device_token",
  ADMIN_SESSION: "admin_session",
} as const;

export const DEFAULTS = {
  STEPS_COUNT: 6,
  UNLOCK_RADIUS_M: 100,
  MAX_SESSIONS: 1,
  LOCATION_RETENTION_HOURS: 24,
  CODE_REF_TTL_MIN: 10,
} as const;

export function formatHHmm(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(date);
}

export function notYetAvailableMessage(revealAt: Date): string {
  return `Le posizioni non sono ancora disponibili. Riprova alle ${formatHHmm(revealAt)}.`;
}
