# Telegram Bot

Admins and organizers can create and manage invite codes from a Telegram bot instead of opening the admin panel — useful on the go, at check-in tables, etc. Each person authenticates with their own **personal API key**, so the bot acts with exactly the permissions their account already has (organizers: only their own events; admins: everything).

## Setup (one-time, admin only)

1. Create a bot with [@BotFather](https://t.me/BotFather) and get its token.
2. In the admin panel, go to **Settings → Telegram**: paste the bot token, tick **Enable the bot**, and save. Leave the webhook secret empty — one is generated for you.
3. In the same tab, press **Register webhook**. This tells Telegram to deliver messages to `<this deployment>/api/telegram/webhook`, with the saved secret. The panel then shows whether Telegram has the webhook registered on this address, on a different one, or not at all.

   The URL is taken from the address you're currently browsing the panel on, so **open the panel on the public URL** before pressing it — Telegram only accepts a publicly reachable HTTPS address and refuses `localhost`. Behind a reverse proxy that connects over localhost (e.g. Cloudflare Tunnel), set [`APP_URL`](Configuration) instead. For local testing, start your tunnel from **Account → ngrok** and open the panel on the ngrok URL.

   Repeat this step whenever the public URL changes (a new ngrok URL, a domain change) — the status line will show the stale address until you do.
4. Each admin/organizer generates their own key from **Account → API** in the admin panel, then messages the bot:
   ```
   /start <their API key>
   ```
   From then on the bot remembers that chat is theirs — no need to resend the key.

## Commands

| Command | Does |
|---|---|
| `/start <key>` | Link this chat to your Perla account |
| `/logout` | Unlink this chat |
| `/eventi` | List your accessible events |
| `/usa <n>` | Select which event the commands below apply to (number from `/eventi`) |
| `/nuovo [n]` | Create `n` (default 1, max 20) personal codes for the selected event |
| `/pubblico [max]` | Create a reusable public code (default 100 uses) — see [Public Codes](Public-Codes) |
| `/lista` | List the selected event's codes (latest 30) |
| `/revoca <codice>` | Revoke a code |
| `/rigenera <codice>` | Replace a code with a new one |
| `/help` | Show this list |

## Under the hood

- `app/api/telegram/webhook/route.ts` — the single entry point Telegram calls. Authenticity is checked via the `secret_token` Telegram echoes back in `X-Telegram-Bot-Api-Secret-Token` (set at registration in step 3), not by request signing.
- `app/api/admin/settings/telegram/webhook/route.ts` — the panel's Register/Remove buttons and the status line, i.e. `setWebhook` / `deleteWebhook` / `getWebhookInfo`. Nothing else in the app calls Telegram outbound except the reply path.
- `lib/telegram/commands.ts` — parses the command and calls the same Prisma operations the admin API routes use (no duplicated business logic, no internal HTTP calls).
- `ApiKey` / `TelegramLink` (Prisma models) — one API key per user (hash-only at rest, shown once at generation), and a chat-to-account link that also remembers which event that chat is currently pointed at.
- `TelegramConfig` (Prisma model) — the singleton bot token/webhook secret set from Settings → Telegram, encrypted at rest (same pattern as the SMTP password and Turnstile secret key).
- Works identically self-hosted or on Vercel — it's a plain webhook route, no long-running process to keep alive.

## Notes

- Every code created/revoked/regenerated via the bot is written to the access log the same as an admin-panel action, tagged as coming from Telegram.
- Regenerating an API key (Account → API) invalidates the previous one immediately — any chat linked with the old key stops working and needs `/start` again with the new one.
