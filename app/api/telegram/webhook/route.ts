// POST /api/telegram/webhook — Telegram calls this for every update once the
// webhook is registered (see Impostazioni → Telegram / docs/wiki/Telegram-Bot.md
// for the setWebhook call). Authenticity is verified via the secret_token
// Telegram echoes back in X-Telegram-Bot-Api-Secret-Token (set at
// registration time), not by signature — this is the mechanism Telegram's
// Bot API actually provides.
//
// Two update shapes are handled: `message` (anything typed — mostly
// /start <key>, see lib/telegram/commands.ts) and `callback_query` (a
// button tap in the menu). Both are awaited to completion before responding
// — on a serverless runtime (Vercel) the function can be frozen or torn
// down right after the response is sent, which would silently drop the
// outbound Telegram call.
import { NextResponse } from "next/server";
import { handleTelegramMessage, handleTelegramCallback } from "@/lib/telegram/commands";
import { sendTelegramMessage, editOrSendTelegramMessage, answerCallbackQuery } from "@/lib/telegram/bot-api";
import { getTelegramConfig } from "@/lib/telegram/config";
import { requestOrigin } from "@/lib/request-url";

export const runtime = "nodejs";

interface TelegramUpdate {
  message?: {
    chat: { id: number | string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number | string };
    };
  };
}

export async function POST(req: Request) {
  const cfg = await getTelegramConfig();
  if (!cfg) {
    // getTelegramConfig() already logged which half is missing when the bot
    // is enabled but incomplete; a disabled bot is silent on purpose.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== cfg.webhookSecret) {
    // Almost always the webhook being registered with a different (or no)
    // secret_token than the one stored here — re-register it from
    // Impostazioni → Telegram, which always sends the two together.
    console.error("Telegram webhook rejected: secret token mismatch — re-register the webhook from Impostazioni → Telegram");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const baseUrl = requestOrigin(req);

  const callback = body?.callback_query;
  if (callback) {
    const chatId = callback.message ? String(callback.message.chat.id) : null;
    const messageId = callback.message?.message_id;
    if (!chatId || messageId === undefined || !callback.data) {
      return NextResponse.json({});
    }
    try {
      const screen = await handleTelegramCallback(chatId, callback.data, baseUrl);
      await Promise.all([
        editOrSendTelegramMessage(chatId, messageId, screen.text, screen.keyboard),
        answerCallbackQuery(callback.id),
      ]);
    } catch (err) {
      console.error("Telegram callback handling failed", err instanceof Error ? err.message : err);
      await answerCallbackQuery(callback.id, "Si è verificato un errore.");
    }
    return NextResponse.json({});
  }

  const message = body?.message;
  if (!message?.text) {
    return NextResponse.json({});
  }

  const chatId = String(message.chat.id);
  try {
    const screen = await handleTelegramMessage(chatId, message.text, baseUrl);
    await sendTelegramMessage(chatId, screen.text, screen.keyboard);
  } catch (err) {
    console.error("Telegram webhook handling failed", err instanceof Error ? err.message : err);
    await sendTelegramMessage(chatId, "Si è verificato un errore. Riprova.");
  }

  return NextResponse.json({});
}
