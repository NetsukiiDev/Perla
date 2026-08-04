// Thin wrapper over the Telegram Bot API. Messages use parse_mode "HTML" so
// codes can render as tappable monospace (<code>) and headers as bold — but
// every interpolated user-controlled string (event/participant names, the
// admin's email) MUST go through lib/telegram/menus.ts's escapeHtml first,
// or a name containing "&"/"<"/">" turns into a malformed-entity 400 that
// silently drops the reply.
import { getTelegramConfig } from "@/lib/telegram/config";

type TelegramResult<T> = { ok: true; result: T } | { ok: false; error: string };

// Telegram answers 200 with {ok:false,description} for application-level
// failures and 4xx for the rest, so neither the fetch promise nor res.ok is
// enough on its own to tell whether a call actually worked.
async function callTelegram<T>(token: string, method: string, params?: Record<string, unknown>): Promise<TelegramResult<T>> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params ?? {}),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!body?.ok) {
      return { ok: false, error: body?.description ?? `HTTP ${res.status}` };
    }
    return { ok: true, result: body.result as T };
  } catch (err) {
    // Network-level failure (no DNS, blocked egress, timeout).
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// One row of buttons in an inline keyboard. Menus are built as
// TelegramKeyboard = TelegramButton[][] — see lib/telegram/menus.ts.
// Telegram accepts exactly one of callback_data (routed back through this
// bot) or url (opens directly, e.g. the participant access link) per button.
export type TelegramButton = { text: string } & ({ callback_data: string } | { url: string });
export type TelegramKeyboard = TelegramButton[][];

function replyMarkup(keyboard?: TelegramKeyboard) {
  return keyboard && keyboard.length > 0 ? { reply_markup: { inline_keyboard: keyboard } } : {};
}

// Sends a new message — used for the chat's very first reply (e.g. right
// after /start) and whenever there's no existing bot message left to edit.
// Every other menu transition uses editTelegramMessage instead, so tapping
// through the menu updates one message in place rather than spamming new
// ones down the chat.
export async function sendTelegramMessage(chatId: string, text: string, keyboard?: TelegramKeyboard): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg) {
    console.error("Telegram bot is not configured (Impostazioni → Telegram), cannot send message");
    return;
  }
  const res = await callTelegram(cfg.botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...replyMarkup(keyboard),
  });
  if (!res.ok) {
    console.error("Failed to send Telegram message:", res.error);
  }
}

// Edits an existing bot message in place — the button-tap path. Falls back
// to sending a new message if the edit fails (message too old to edit,
// deleted, or "message is not modified" when the text+keyboard are
// unchanged), so a tap never silently does nothing from the chat's side.
export async function editOrSendTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: TelegramKeyboard,
): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg) {
    console.error("Telegram bot is not configured (Impostazioni → Telegram), cannot send message");
    return;
  }
  const res = await callTelegram(cfg.botToken, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...replyMarkup(keyboard),
  });
  if (!res.ok) {
    if (res.error.includes("message is not modified")) return; // nothing to do, not a real failure
    const sendRes = await callTelegram(cfg.botToken, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...replyMarkup(keyboard),
    });
    if (!sendRes.ok) console.error("Failed to send Telegram message (after edit failed):", res.error, sendRes.error);
  }
}

// Stops the button's loading spinner. Telegram expects this within a few
// seconds of every callback_query, independent of whether the edit above
// succeeds — an un-acknowledged tap leaves the button visibly stuck spinning.
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg) return;
  const res = await callTelegram(cfg.botToken, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
  if (!res.ok) {
    console.error("Failed to answer Telegram callback query:", res.error);
  }
}

export interface TelegramWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export async function getWebhookInfo(token: string): Promise<TelegramResult<TelegramWebhookInfo>> {
  return callTelegram<TelegramWebhookInfo>(token, "getWebhookInfo");
}

// `allowed_updates` keeps Telegram from delivering update types the webhook
// route ignores anyway. "callback_query" is required for the button menu —
// without it, taps are silently never sent to the webhook at all.
// drop_pending_updates discards whatever piled up while the webhook was
// unregistered — those are stale by now.
export async function setWebhook(token: string, url: string, secret: string): Promise<TelegramResult<boolean>> {
  return callTelegram<boolean>(token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<TelegramResult<boolean>> {
  return callTelegram<boolean>(token, "deleteWebhook", { drop_pending_updates: true });
}

export interface TelegramBotCommand {
  command: string;
  description: string;
}

// Populates Telegram's "/" command hint menu in the compose box — purely
// discoverability, the commands work via handleTelegramMessage regardless.
// Called once whenever the webhook is (re)registered, since that's already
// the "the bot is being set up" moment.
export async function setMyCommands(token: string, commands: TelegramBotCommand[]): Promise<TelegramResult<boolean>> {
  return callTelegram<boolean>(token, "setMyCommands", { commands });
}

export interface TelegramBotIdentity {
  username?: string;
  first_name?: string;
}

export async function getBotIdentity(token: string): Promise<TelegramResult<TelegramBotIdentity>> {
  return callTelegram<TelegramBotIdentity>(token, "getMe");
}
