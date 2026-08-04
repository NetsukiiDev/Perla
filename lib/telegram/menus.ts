// Builds the text + inline keyboard for every screen of the button menu.
// Pure functions only (no I/O) — lib/telegram/commands.ts calls these after
// doing whatever Prisma work a screen needs, then hands the result to
// bot-api.ts to actually send/edit. Kept separate from commands.ts so the
// "what does each screen look like" concern doesn't get lost inside the
// "what does each button do" one.
import type { TelegramKeyboard } from "@/lib/telegram/bot-api";
import type { Event, InviteCode, Participant } from "@/lib/generated/prisma/client";
import { codeAccessUrl } from "@/lib/code-access-link";
import { UNLIMITED_SESSIONS, DEFAULT_INVITE_MESSAGE_TEMPLATE } from "@/lib/constants";

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

// Every message is sent with parse_mode "HTML" (see bot-api.ts) — any
// interpolated string that isn't developer-authored (event/participant
// names, the admin's email) MUST go through this first, or an unescaped
// "&"/"<"/">" turns into a malformed-entity error that drops the whole reply.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    text: `👋 Ciao! Sei collegato come <b>${escapeHtml(email)}</b>.\n\nCosa vuoi fare?`,
    keyboard: [
      [{ text: "📅 I miei eventi", callback_data: "events" }],
      [{ text: "🚪 Disconnetti", callback_data: "logout" }],
    ],
  };
}

export function eventsMenu(events: Array<Pick<Event, "id" | "internalName" | "status">>): TelegramScreen {
  if (events.length === 0) {
    return {
      text: "📭 Non hai ancora nessun evento — creane uno dal pannello web.",
      keyboard: [[{ text: "🔙 Menu principale", callback_data: "main" }]],
    };
  }
  const statusEmoji: Record<string, string> = { draft: "📝", active: "🟢", ended: "⚪" };
  return {
    text: "📅 I tuoi eventi — seleziona su quale lavorare:",
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
    text: `📌 Evento: <b>${escapeHtml(event.internalName)}</b>\n\nCosa vuoi fare?`,
    keyboard: [
      [{ text: "➕ Nuovo codice", callback_data: "newq" }],
      [{ text: "🌐 Codice pubblico", callback_data: "pubq" }],
      [{ text: "📋 Lista codici", callback_data: "list" }],
      [{ text: "✏️ Personalizza messaggio", callback_data: "editmsg" }],
      [{ text: "🔁 Cambia evento", callback_data: "events" }],
      [{ text: "🏠 Menu principale", callback_data: "main" }],
    ],
  };
}

export function newCodeQtyMenu(): TelegramScreen {
  return {
    text: "➕ Quanti codici personali vuoi creare?",
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
    text: `✏️ ${prompt}`,
    keyboard: [[{ text: "❌ Annulla", callback_data: "cancelp" }]],
  };
}

export function newCodesResult(eventName: string, codes: string[], baseUrl: string): TelegramScreen {
  const list = codes.map((c) => `🔑 <code>${c}</code>\n🔗 ${codeAccessUrl(baseUrl, c)}`).join("\n\n");
  return {
    text:
      `✅ Creati <b>${codes.length}</b> codice/i per "<b>${escapeHtml(eventName)}</b>":\n\n${list}\n\n` +
      "Ogni codice è personale e monouso: invia a ciascun partecipante il proprio link — aprendolo si attiva subito, oppure può scrivere il codice a mano sulla pagina.",
    keyboard: [
      [{ text: "📤 Crea messaggio inoltrabile", callback_data: "fwdstart" }],
      [{ text: "➕ Crea altri", callback_data: "newq" }],
      [{ text: "🔙 Evento", callback_data: "backev" }],
    ],
  };
}

// One participant's message at a time, ready to hand-forward as-is: the text
// is exactly what a participant should see (built from Event.inviteMessageTemplate,
// or DEFAULT_INVITE_MESSAGE_TEMPLATE when unset) — no bot chrome mixed in,
// since Telegram's "forward" carries a message's text but never its inline
// keyboard, so navigation only ever lives in the buttons.
export function forwardMessageScreen(
  event: Pick<Event, "internalName" | "inviteMessageTemplate">,
  code: string,
  baseUrl: string,
  index: number,
  total: number,
): TelegramScreen {
  const template = event.inviteMessageTemplate || DEFAULT_INVITE_MESSAGE_TEMPLATE;
  const url = codeAccessUrl(baseUrl, code);
  const text = escapeHtml(template)
    .replace(/\{link\}/g, url)
    .replace(/\{event\}/g, escapeHtml(event.internalName))
    .replace(/\{code\}/g, code);

  const isLast = index >= total - 1;
  return {
    text,
    keyboard: isLast
      ? [[{ text: "✅ Fine — torna all'evento", callback_data: "backev" }]]
      : [
          [{ text: `➡️ Messaggio successivo (${index + 2}/${total})`, callback_data: "fwdnext" }],
          [{ text: "🔙 Evento", callback_data: "backev" }],
        ],
  };
}

export function publicCodeMaxMenu(): TelegramScreen {
  return {
    text: "🌐 Codice pubblico riutilizzabile — quanti utilizzi massimi?",
    keyboard: [
      [
        { text: "50", callback_data: "pubn:50" },
        { text: "100", callback_data: "pubn:100" },
        { text: "500", callback_data: "pubn:500" },
      ],
      [{ text: "♾️ Illimitato", callback_data: "pubn:0" }],
      [{ text: "✏️ Altro numero…", callback_data: "pubc" }],
      [{ text: "🔙 Indietro", callback_data: "backev" }],
    ],
  };
}

export function publicCodeResult(eventName: string, code: string, maxSessions: number, baseUrl: string): TelegramScreen {
  const unlimited = maxSessions === UNLIMITED_SESSIONS;
  const usesLabel = unlimited ? "illimitati" : `max ${maxSessions}`;
  const capNote = unlimited ? "" : `, fino a ${maxSessions} utilizzi complessivi`;
  const url = codeAccessUrl(baseUrl, code);
  return {
    text:
      `✅ Codice pubblico creato per "<b>${escapeHtml(eventName)}</b>" (utilizzi: ${usesLabel})\n\n` +
      `🔑 <code>${code}</code>\n🔗 ${url}\n\n` +
      `Condividi questo link con chiunque: chi lo apre parte subito con una propria sessione${capNote}.`,
    keyboard: [
      [{ text: "🔗 Apri link", url }],
      [{ text: "🔙 Evento", callback_data: "backev" }],
    ],
  };
}

export function codesListMenu(
  eventName: string,
  codes: Array<InviteCode & { participant: Participant | null; plainCode: string }>,
  totalCount: number,
): TelegramScreen {
  if (codes.length === 0) {
    return {
      text: `📭 Nessun codice per "<b>${escapeHtml(eventName)}</b>".`,
      keyboard: [[{ text: "🔙 Evento", callback_data: "backev" }]],
    };
  }
  const header =
    totalCount > codes.length
      ? `📋 Codici per "<b>${escapeHtml(eventName)}</b>" (${codes.length} più recenti di ${totalCount}):`
      : `📋 Codici per "<b>${escapeHtml(eventName)}</b>":`;
  return {
    text: `${header}\nTocca un codice per vederne il link, revocarlo o rigenerarlo.`,
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

export function codeDetailMenu(eventName: string, code: InviteCode & { plainCode: string }, baseUrl: string): TelegramScreen {
  const url = codeAccessUrl(baseUrl, code.plainCode);
  // No status gating — matches the web panel's own participants table, where
  // regenerate/revoke are offered regardless of the code's current status.
  return {
    text:
      `📄 Evento: <b>${escapeHtml(eventName)}</b>\n` +
      `Codice: <code>${code.plainCode}</code>\n` +
      `Stato: ${STATUS_LABEL[code.status] ?? code.status}${code.isPublic ? " (pubblico)" : ""}\n` +
      `🔗 ${url}`,
    keyboard: [
      [{ text: "🔗 Apri link", url }],
      [{ text: "🔁 Rigenera", callback_data: `rg:${code.id}` }],
      [{ text: "🚫 Revoca", callback_data: `rv:${code.id}` }],
      [{ text: "🔙 Lista codici", callback_data: "list" }],
    ],
  };
}

export function confirmMenu(message: string, confirmData: string, cancelData: string): TelegramScreen {
  return {
    text: `❓ ${message}`,
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
    text: `✅ ${text}`,
    keyboard: [[{ text: backLabel, callback_data: backData }]],
  };
}

export function errorScreen(text: string, backData = "main", backLabel = "🔙 Menu principale"): TelegramScreen {
  return {
    text: `⚠️ ${text}`,
    keyboard: [[{ text: backLabel, callback_data: backData }]],
  };
}

export function loggedOutScreen(): TelegramScreen {
  return {
    text: "👋 Disconnesso. Scrivi /start &lt;la tua API Key&gt; per ricollegarti quando vuoi.",
    keyboard: [],
  };
}

export function notLinkedScreen(): TelegramScreen {
  return {
    text: "🔒 Non sei collegato. Genera una API Key da Perla (Account → API) e scrivi:\n/start &lt;la tua chiave&gt;",
    keyboard: [],
  };
}
