# Telegram Bot

Admins and organizers can create and manage invite codes from a Telegram bot instead of opening the admin panel — useful on the go, at check-in tables, etc. Each person authenticates with their own **personal API key**, so the bot acts with exactly the permissions their account already has (organizers: only their own events; admins: everything).

The bot is menu-driven: after linking, every screen is a message with inline buttons — selecting an event, creating codes, listing them, revoking or regenerating one are all taps. Typing is only ever needed for `/start <key>` (pasting a secret can't be a button) and, as an escape hatch, a custom number when none of the preset buttons fit (e.g. "37 codes" when the buttons only offer 1/5/10).

## Setup (one-time, admin only)

1. Create a bot with [@BotFather](https://t.me/BotFather) and get its token.
2. In the admin panel, go to **Settings → Telegram**: paste the bot token, tick **Enable the bot**, and save. Leave the webhook secret empty — one is generated for you.
3. In the same tab, press **Register webhook**. This tells Telegram to deliver messages to `<this deployment>/api/telegram/webhook`, with the saved secret. The panel then shows whether Telegram has the webhook registered on this address, on a different one, or not at all.

   The URL is taken from the address you're currently browsing the panel on, so **open the panel on the public URL** before pressing it — Telegram only accepts a publicly reachable HTTPS address and refuses `localhost`. Behind a reverse proxy that connects over localhost, set [`APP_URL`](Configuration) instead. For local testing, start a tunnel from **Account → ngrok** or **Account → Tunnel Cloudflare** (the second is a plain fallback for whoever's network or antivirus blocks ngrok specifically — see [Configuration](Configuration)) and open the panel on that tunnel's URL.

   Repeat this step whenever the public URL changes (a new ngrok URL, a domain change) — the status line will show the stale address until you do.
4. Each admin/organizer generates their own key from **Account → API** in the admin panel, then messages the bot:
   ```
   /start <their API key>
   ```
   The bot replies with the main menu and remembers that chat is theirs from then on — no need to resend the key.

## The menu

```
🏠 Menu principale
├── 📅 I miei eventi
│    └── (an event) → evento selezionato
│         ├── ➕ Nuovo codice → 1 / 5 / 10 / ✏️ Altro numero…
│         ├── 🌐 Codice pubblico → 50 / 100 / 500 / ✏️ Altro numero…
│         ├── 📋 Lista codici → (a code) → 🔁 Rigenera / 🚫 Revoca (each asks ✅/❌ to confirm)
│         ├── 🔁 Cambia evento
│         └── 🏠 Menu principale
└── 🚪 Disconnetti (asks ✅/❌ to confirm)
```

Every tap edits the same message in place rather than sending a new one each time, so the chat stays a single evolving screen instead of a scrolling wall of replies. `/menu` (or `/help`) reopens the main menu at any point; `/logout` unlinks immediately without the confirm step (typing it is already the deliberate action).

## Under the hood

- `app/api/telegram/webhook/route.ts` — the single entry point Telegram calls, for both typed messages and button taps (`callback_query` updates). Authenticity is checked via the `secret_token` Telegram echoes back in `X-Telegram-Bot-Api-Secret-Token` (set at registration in step 3), not by request signing.
- `app/api/admin/settings/telegram/webhook/route.ts` — the panel's Register/Remove buttons and the status line, i.e. `setWebhook` / `deleteWebhook` / `getWebhookInfo`.
- `lib/telegram/commands.ts` — `handleTelegramMessage` (typed input) and `handleTelegramCallback` (button taps) both call the same Prisma operations the admin API routes use (no duplicated business logic, no internal HTTP calls) and return a screen for the webhook route to display.
- `lib/telegram/menus.ts` — the text + inline keyboard for every screen, kept separate from the routing/business logic in `commands.ts`.
- `lib/telegram/bot-api.ts` — `sendTelegramMessage` (first reply in a chat) and `editOrSendTelegramMessage` (every button-driven transition; falls back to sending if the edit fails) plus `answerCallbackQuery`, which Telegram expects on every tap to stop the button's loading spinner.
- `ApiKey` / `TelegramLink` (Prisma models) — one API key per user (hash-only at rest, shown once at generation), and a chat-to-account link that also remembers which event that chat is currently pointed at, plus `pendingAction` for the one case that still needs typing (see below).
- `TelegramConfig` (Prisma model) — the singleton bot token/webhook secret set from Settings → Telegram, encrypted at rest (same pattern as the SMTP password and Turnstile secret key).
- Works identically self-hosted or on Vercel — it's a plain webhook route, no long-running process to keep alive.

## Notes

- Every code created/revoked/regenerated via the bot is written to the access log the same as an admin-panel action, tagged as coming from Telegram.
- Regenerating an API key (Account → API) invalidates the previous one immediately — any chat linked with the old key stops working and needs `/start` again with the new one.
- "✏️ Altro numero…" (a code quantity or usage cap outside the preset buttons) is the only typing besides `/start` — it arms `TelegramLink.pendingAction`, and the next message from that chat is read as the number instead of showing the menu. Tapping any other button, or "❌ Annulla", clears it again.
- **If you're updating from a version with typed commands** (`/eventi`, `/usa`, `/nuovo`, …): those still exist as menu actions, just not as commands — re-register the webhook (step 3 above) after deploying, since it now needs Telegram to deliver `callback_query` updates (button taps) too, which an older registration didn't ask for.
