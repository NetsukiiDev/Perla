import type { Dictionary } from "./types";

export const it: Dictionary = {
  nav: {
    events: "Eventi",
    users: "Utenti",
    account: "Account",
    settings: "Impostazioni",
    logout: "Esci",
  },
  settings: {
    title: "Impostazioni",
    language: {
      section: "Lingua",
      description: "Scegli la lingua dell'interfaccia.",
      italian: "Italiano",
      english: "English",
    },
    version: {
      section: "Versione",
      current: "Versione attuale",
      check: "Verifica aggiornamenti",
      checking: "Verifica in corso…",
      available: "Aggiornamento disponibile!",
      availableTo: "Versione {version} disponibile.",
      viewOnGithub: "Vedi su GitHub",
      failed: "Impossibile verificare aggiornamenti.",
      upToDate: "Versione aggiornata.",
    },
    info: {
      section: "Informazioni",
      environment: "Ambiente",
      commit: "Commit",
      notAvailable: "N/D",
    },
  },
};
