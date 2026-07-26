// Loads the singleton Telegram bot config, decrypting the bot token and
// webhook secret at read time. Same shape as lib/mailer.ts's getSmtpConfig —
// returns null when never configured or disabled, so callers can distinguish
// "not set up" from "bot token unreadable" only where they need to.
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { generateRandomToken } from "@/lib/hash";

export interface TelegramConfig {
  botToken: string;
  webhookSecret: string;
}

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg || !cfg.enabled) return null;
  // An enabled config missing either half is a misconfiguration, not a
  // deliberate "off" — without this the webhook just 401s every update and
  // the bot looks dead with nothing in the logs to say why.
  if (!cfg.botTokenEncrypted || !cfg.webhookSecretEncrypted) {
    console.error(
      `Telegram bot is enabled but incomplete (${!cfg.botTokenEncrypted ? "bot token" : "webhook secret"} missing) — re-save it in Impostazioni → Telegram`,
    );
    return null;
  }

  try {
    return {
      botToken: decrypt(cfg.botTokenEncrypted),
      webhookSecret: decrypt(cfg.webhookSecretEncrypted),
    };
  } catch (err) {
    // ENCRYPTION_KEY changed since these were saved — logged so this
    // doesn't look identical to "not configured" in the server logs.
    console.error("Stored Telegram config is unreadable (ENCRYPTION_KEY mismatch?)", err instanceof Error ? err.message : err);
    return null;
  }
}

// The bot token regardless of `enabled`: the admin routes need it to talk to
// Telegram (read webhook status, register/remove the webhook) both before the
// bot is switched on and after it's switched off.
export async function getTelegramBotToken(): Promise<string | null> {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg?.botTokenEncrypted) return null;
  try {
    return decrypt(cfg.botTokenEncrypted);
  } catch (err) {
    console.error("Stored Telegram bot token is unreadable (ENCRYPTION_KEY mismatch?)", err instanceof Error ? err.message : err);
    return null;
  }
}

// Returns the webhook secret, generating and storing one when the config has
// none. The secret exists only so this app can recognise Telegram's callbacks
// — there's no reason to make an admin invent it, and a config saved without
// one would otherwise reject every incoming update.
export async function ensureWebhookSecret(): Promise<string | null> {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return null;

  if (cfg.webhookSecretEncrypted) {
    try {
      return decrypt(cfg.webhookSecretEncrypted);
    } catch {
      // Unreadable (ENCRYPTION_KEY rotated) — replacing it is the only way
      // forward, and it's re-registered with Telegram in the same breath.
    }
  }

  const secret = generateRandomToken(32);
  await prisma.telegramConfig.update({ where: { id: "default" }, data: { webhookSecretEncrypted: encrypt(secret) } });
  return secret;
}
