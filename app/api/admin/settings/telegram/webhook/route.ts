// Webhook management for the Telegram bot. Telegram only delivers updates to
// a URL that has been registered with setWebhook, and Perla is self-hosted
// behind whatever origin the operator happens to use (a domain, a Cloudflare
// Tunnel, ngrok) — that URL can change between deployments, so registering it
// belongs in the panel rather than in a curl command run once by hand.
//
//   GET    — what Telegram currently has registered, next to what this
//            deployment expects, so a stale URL is visible at a glance
//   POST   — point Telegram at this deployment (creating the webhook secret
//            if the saved config has none)
//   DELETE — unregister, so a disabled bot stops Telegram retrying against a
//            route that now answers 401
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getTelegramBotToken, ensureWebhookSecret } from "@/lib/telegram/config";
import { getWebhookInfo, setWebhook, deleteWebhook, getBotIdentity } from "@/lib/telegram/bot-api";
import { requestUrl } from "@/lib/request-url";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

const WEBHOOK_PATH = "/api/telegram/webhook";

export async function GET(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const expectedUrl = requestUrl(req, WEBHOOK_PATH).toString();

  const token = await getTelegramBotToken();
  if (!token) return NextResponse.json({ hasToken: false, expectedUrl });

  const [info, identity] = await Promise.all([getWebhookInfo(token), getBotIdentity(token)]);
  if (!info.ok) {
    return NextResponse.json({ hasToken: true, expectedUrl, error: info.error }, { status: 502 });
  }

  return NextResponse.json({
    hasToken: true,
    expectedUrl,
    botUsername: identity.ok ? identity.result.username ?? null : null,
    registeredUrl: info.result.url || null,
    pendingUpdateCount: info.result.pending_update_count,
    lastErrorMessage: info.result.last_error_message ?? null,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const url = requestUrl(req, WEBHOOK_PATH);
  // Telegram only accepts a publicly resolvable HTTPS URL. Catching that here
  // turns an opaque Telegram error into a specific "this deployment isn't
  // reachable from the internet" — the usual case when the panel is being
  // used over localhost or plain HTTP without a tunnel in front.
  if (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(url.hostname)) {
    return NextResponse.json({ error: "not_public", expectedUrl: url.toString() }, { status: 400 });
  }

  const token = await getTelegramBotToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 400 });

  const secret = await ensureWebhookSecret();
  if (!secret) return NextResponse.json({ error: "no_token" }, { status: 400 });

  const res = await setWebhook(token, url.toString(), secret);
  if (!res.ok) {
    console.error("Telegram setWebhook failed:", res.error);
    return NextResponse.json({ error: "telegram_error", detail: res.error }, { status: 502 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Webhook Telegram registrato", url: url.toString() } });
  return NextResponse.json({ ok: true, registeredUrl: url.toString() });
}

export async function DELETE() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const token = await getTelegramBotToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 400 });

  const res = await deleteWebhook(token);
  if (!res.ok) {
    console.error("Telegram deleteWebhook failed:", res.error);
    return NextResponse.json({ error: "telegram_error", detail: res.error }, { status: 502 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: "Webhook Telegram rimosso" } });
  return NextResponse.json({ ok: true });
}
