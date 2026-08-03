// Builds the text + inline keyboard for every screen of the button menu.
// Pure functions only (no I/O) — lib/telegram/commands.ts calls these after
// doing whatever Prisma work a screen needs, then hands the result to
// bot-api.ts to actually send/edit. Kept separate from commands.ts so the
// "what does each screen look like" concern doesn't get lost inside the
// "what does each button do" one.
import type { TelegramKeyboard } from "@/lib/telegram/bot-api";
import type { Event, InviteCode, Participant } from "@/lib/generated/prisma/client";

export interface TelegramScreen {
  text: string;
  keyboard: TelegramKeyboard;
}

// Telegram rejects a whole message if any single inline button's text
// exceeds 64 characters — a user-chosen display name (up to 255 chars, see
// Participant.displayName) could otherwise take the entire menu down, not
// just look odd.
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const STATUS_LABEL: Record<string, string> = {
  created: "creato",
  valid: "valido",
  scheduled: "in attesa",
  started: "partito",
  in_progress: "in viaggio",
  arrived: "arrivato",
  expired: "scaduto",
  revoked: "revocato",
};

export function mainMenu(email: string): TelegramScreen {
  return {
    text: `Ciao! Sei collegato come ${email}.\n\nCosa vuoi fare?`,
    keyboard: [
      [{ text: "📅 I miei eventi", callback_data: "events" }],
      [{ text: "🚪 Disconnetti", callback_data: "logout" }],
    ],
  };
}

export function eventsMenu(events: Array<Pick<Event, "id" | "internalName" | "status">>): TelegramScreen {
  if (events.length === 0) {
    return {
      text: "Non hai ancora nessun evento — creane uno dal pannello web.",
      keyboard: [[{ text: "🔙 Menu principale", callback_data: "main" }]],
    };
  }
  const statusEmoji: Record<string, string> = { draft: "📝", active: "🟢", ended: "⚪" };
  return {
    text: "I tuoi eventi — seleziona su quale lavorare:",
    keyboard: [
      ...events.map((e) => [
        { text: truncate(`${statusEmoji[e.status] ?? "•"} ${e.internalName}`, 64), callback_data: `ev:${e.id}` },
      ]),
      [{ text: "🔙 Menu principale", callback_data: "main" }],
    ],
  };
}

export function eventMenu(event: Pick<Event, "internalName">): TelegramScreen {
  return {
    text: `Evento: ${event.internalName}\n\nCosa vuoi fare?`,
    keyboard: [
      [{ text: "➕ Nuovo codice", callback_data: "newq" }],
      [{ text: "🌐 Codice pubblico", callback_data: "pubq" }],
      [{ text: "📋 Lista codici", callback_data: "list" }],
      [{ text: "🔁 Cambia evento", callback_data: "events" }],
      [{ text: "🏠 Menu principale", callback_data: "main" }],
    ],
  };
}

export function newCodeQtyMenu(): TelegramScreen {
  return {
    text: "Quanti codici personali vuoi creare?",
    keyboard: [
      [
        { text: "1", callback_data: "newn:1" },
        { text: "5", callback_data: "newn:5" },
        { text: "10", callback_data: "newn:10" },
      ],
      [{ text: "✏️ Altro numero…", callback_data: "newc" }],
      [{ text: "🔙 Indietro", callback_data: "backev" }],
    ],
  };
}

export function askCustomNumber(prompt: string): TelegramScreen {
  return {
    text: prompt,
    keyboard: [[{ text: "❌ Annulla", callback_data: "cancelp" }]],
  };
}

export function newCodesResult(eventName: string, codes: string[]): TelegramScreen {
  return {
    text: `Creati ${codes.length} codice/i per "${eventName}":\n${codes.join("\n")}`,
    keyboard: [
      [{ text: "➕ Crea altri", callback_data: "newq" }],
      [{ text: "🔙 Evento", callback_data: "backev" }],
    ],
  };
}

export function publicCodeMaxMenu(): TelegramScreen {
  return {
    text: "Codice pubblico riutilizzabile — quanti utilizzi massimi?",
    keyboard: [
      [
        { text: "50", callback_data: "pubn:50" },
        { text: "100", callback_data: "pubn:100" },
        { text: "500", callback_data: "pubn:500" },
      ],
      [{ text: "✏️ Altro numero…", callback_data: "pubc" }],
      [{ text: "🔙 Indietro", callback_data: "backev" }],
    ],
  };
}

export function publicCodeResult(eventName: string, code: string, maxSessions: number): TelegramScreen {
  return {
    text: `Codice pubblico creato per "${eventName}" (max ${maxSessions} utilizzi):\n${code}`,
    keyboard: [[{ text: "🔙 Evento", callback_data: "backev" }]],
  };
}

export function codesListMenu(
  eventName: string,
  codes: Array<InviteCode & { participant: Participant | null; plainCode: string }>,
  totalCount: number,
): TelegramScreen {
  if (codes.length === 0) {
    return {
      text: `Nessun codice per "${eventName}".`,
      keyboard: [[{ text: "🔙 Evento", callback_data: "backev" }]],
    };
  }
  const header =
    totalCount > codes.length
      ? `Codici per "${eventName}" (${codes.length} più recenti di ${totalCount}):`
      : `Codici per "${eventName}":`;
  return {
    text: `${header}\nTocca un codice per revocarlo o rigenerarlo.`,
    keyboard: [
      ...codes.map((c) => {
        const who = c.isPublic ? "pubblico" : c.participant?.displayName || "ospite";
        const label = truncate(`${c.plainCode} · ${STATUS_LABEL[c.status] ?? c.status} (${who})`, 64);
        return [{ text: label, callback_data: `code:${c.id}` }];
      }),
      [{ text: "🔙 Evento", callback_data: "backev" }],
    ],
  };
}

export function codeDetailMenu(eventName: string, code: InviteCode & { plainCode: string }): TelegramScreen {
  // No status gating — matches the web panel's own participants table, where
  // regenerate/revoke are offered regardless of the code's current status.
  return {
    text: `Evento: ${eventName}\nCodice: ${code.plainCode}\nStato: ${STATUS_LABEL[code.status] ?? code.status}${code.isPublic ? " (pubblico)" : ""}`,
    keyboard: [
      [{ text: "🔁 Rigenera", callback_data: `rg:${code.id}` }],
      [{ text: "🚫 Revoca", callback_data: `rv:${code.id}` }],
      [{ text: "🔙 Lista codici", callback_data: "list" }],
    ],
  };
}

export function confirmMenu(message: string, confirmData: string, cancelData: string): TelegramScreen {
  return {
    text: message,
    keyboard: [
      [
        { text: "✅ Conferma", callback_data: confirmData },
        { text: "❌ Annulla", callback_data: cancelData },
      ],
    ],
  };
}

export function actionResult(text: string, backData: string, backLabel = "🔙 Lista codici"): TelegramScreen {
  return {
    text,
    keyboard: [[{ text: backLabel, callback_data: backData }]],
  };
}

export function errorScreen(text: string, backData = "main", backLabel = "🔙 Menu principale"): TelegramScreen {
  return {
    text,
    keyboard: [[{ text: backLabel, callback_data: backData }]],
  };
}

export function loggedOutScreen(): TelegramScreen {
  return {
    text: "Disconnesso. Scrivi /start <la tua API Key> per ricollegarti quando vuoi.",
    keyboard: [],
  };
}

export function notLinkedScreen(): TelegramScreen {
  return {
    text: "Non sei collegato. Genera una API Key da Perla (Account → API) e scrivi:\n/start <la tua chiave>",
    keyboard: [],
  };
}
