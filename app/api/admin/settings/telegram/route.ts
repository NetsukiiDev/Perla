// GET /api/admin/settings/telegram — current bot config (secrets never returned)
// PUT /api/admin/settings/telegram — create/update the singleton bot config
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { telegramConfigSchema } from "@/lib/validation/admin-auth";
import { encrypt } from "@/lib/crypto";
import { generateRandomToken } from "@/lib/hash";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    hasBotToken: Boolean(cfg.botTokenEncrypted),
    hasWebhookSecret: Boolean(cfg.webhookSecretEncrypted),
    enabled: cfg.enabled,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = telegramConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const { botToken, webhookSecret, enabled } = parsed.data;

  try {
    const existing = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
    const botTokenEncrypted = botToken && botToken.length > 0 ? encrypt(botToken) : existing?.botTokenEncrypted ?? null;
    // The webhook secret only ever has to match between what we register with
    // Telegram and what we check on the way back in, so one is generated when
    // the admin leaves the field empty. Saving a config without it used to be
    // accepted and reported as success, but left the bot unable to accept a
    // single update (every webhook call 401s) with no hint as to why.
    const webhookSecretEncrypted =
      webhookSecret && webhookSecret.length > 0
        ? encrypt(webhookSecret)
        : existing?.webhookSecretEncrypted ?? (botTokenEncrypted ? encrypt(generateRandomToken(32)) : null);

    await prisma.telegramConfig.upsert({
      where: { id: "default" },
      create: { id: "default", botTokenEncrypted, webhookSecretEncrypted, enabled },
      update: { botTokenEncrypted, webhookSecretEncrypted, enabled },
    });
  } catch (err) {
    console.error("Failed to save Telegram config", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Configurazione Telegram salvata" } });
  return NextResponse.json({ ok: true });
}
