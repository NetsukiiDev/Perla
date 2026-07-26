// Thin wrapper over the Telegram Bot API. Messages are plain text only (no
// parse_mode) — event/participant names are user-controlled and escaping them
// correctly for Telegram's HTML/Markdown subset isn't worth the risk of a
// malformed-entity 400 breaking a reply.
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

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg) {
    console.error("Telegram bot is not configured (Impostazioni → Telegram), cannot send message");
    return;
  }
  const res = await callTelegram(cfg.botToken, "sendMessage", { chat_id: chatId, text });
  if (!res.ok) {
    console.error("Failed to send Telegram message:", res.error);
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

// `allowed_updates: ["message"]` keeps Telegram from delivering update types
// the webhook route ignores anyway. drop_pending_updates discards whatever
// piled up while the webhook was unregistered — those are stale by now.
export async function setWebhook(token: string, url: string, secret: string): Promise<TelegramResult<boolean>> {
  return callTelegram<boolean>(token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<TelegramResult<boolean>> {
  return callTelegram<boolean>(token, "deleteWebhook", { drop_pending_updates: true });
}

export interface TelegramBotIdentity {
  username?: string;
  first_name?: string;
}

export async function getBotIdentity(token: string): Promise<TelegramResult<TelegramBotIdentity>> {
  return callTelegram<TelegramBotIdentity>(token, "getMe");
}
