// POST /api/telegram/webhook — Telegram calls this for every update once the
// webhook is registered (see Impostazioni → Telegram / docs/wiki/Telegram-Bot.md
// for the setWebhook call). Authenticity is verified via the secret_token
// Telegram echoes back in X-Telegram-Bot-Api-Secret-Token (set at
// registration time), not by signature — this is the mechanism Telegram's
// Bot API actually provides.
//
// The whole flow (parse → run the command → send the reply) is awaited
// before responding, rather than firing the reply in the background after an
// early 200 — on a serverless runtime (Vercel) the function can be frozen or
// torn down right after the response is sent, which would silently drop the
// outbound sendMessage call.
import { NextResponse } from "next/server";
import { handleTelegramMessage } from "@/lib/telegram/commands";
import { sendTelegramMessage } from "@/lib/telegram/bot-api";
import { getTelegramConfig } from "@/lib/telegram/config";

export const runtime = "nodejs";

interface TelegramUpdate {
  message?: {
    chat: { id: number | string };
    text?: string;
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
  const message = body?.message;
  if (!message?.text) {
    return NextResponse.json({});
  }

  const chatId = String(message.chat.id);
  try {
    const reply = await handleTelegramMessage(chatId, message.text);
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error("Telegram webhook handling failed", err instanceof Error ? err.message : err);
    await sendTelegramMessage(chatId, "Si è verificato un errore. Riprova.");
  }

  return NextResponse.json({});
}
