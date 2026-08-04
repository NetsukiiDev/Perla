// Telegram bot dispatcher. Every handler below reuses the exact same Prisma
// operations as the equivalent admin API route (see the route files under
// app/api/admin/{events,participants,codes}/*) rather than duplicating
// business logic — this file only adds the chat-command/button routing and
// the Telegram-specific "which event is this chat currently working on"
// state.
//
// The whole bot is menu-driven: two entry points from the webhook route —
// handleTelegramMessage for anything typed, handleTelegramCallback for
// button taps — and both return a TelegramScreen (text + keyboard, see
// lib/telegram/menus.ts) for the webhook route to display. Typing is only
// ever required for /start <key> (pasting a secret can't be a button) and,
// as an escape hatch, a custom number when a preset button doesn't fit
// (tracked via TelegramLink.pendingAction).
import { prisma } from "@/lib/db";
import { assertOwnsEvent } from "@/lib/admin-guard";
import { verifyApiKey } from "@/lib/api-key";
import { buildCodeRecord } from "@/lib/invite-code";
import { decrypt } from "@/lib/crypto";
import { DEFAULTS } from "@/lib/constants";
import { writeAccessLog } from "@/lib/access-log";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import type { AdminUser, Event, InviteCode } from "@/lib/generated/prisma/client";
import {
  mainMenu,
  eventsMenu,
  eventMenu,
  newCodeQtyMenu,
  askCustomNumber,
  newCodesResult,
  publicCodeMaxMenu,
  publicCodeResult,
  codesListMenu,
  codeDetailMenu,
  forwardMessageScreen,
  confirmMenu,
  actionResult,
  errorScreen,
  loggedOutScreen,
  notLinkedScreen,
  type TelegramScreen,
} from "@/lib/telegram/menus";

const MAX_ATTEMPTS = 5;
const MAX_NEW_CODES_PER_COMMAND = 20;
const MAX_PUBLIC_USES = 10000;
const CODES_LIST_LIMIT = 10;
const MAX_INVITE_MESSAGE_LENGTH = 1000;

interface LinkedChat {
  chatId: string;
  adminUserId: string;
  selectedEventId: string | null;
  pendingAction: string | null;
  pendingForwardCodes: string | null;
  pendingForwardIndex: number;
  adminUser: AdminUser;
}

async function getLink(chatId: string): Promise<LinkedChat | null> {
  return prisma.telegramLink.findUnique({ where: { chatId }, include: { adminUser: true } });
}

function decryptCode(encrypted: string | null): string {
  if (!encrypted) return "?";
  try {
    return decrypt(encrypted);
  } catch {
    return "(illeggibile)";
  }
}

// ── Entry points used by the webhook route ──────────────────────────────

export async function handleTelegramMessage(chatId: string, text: string, baseUrl: string): Promise<TelegramScreen> {
  const trimmed = text.trim();

  if (/^\/start(\s|$)/.test(trimmed) || /^\/link(\s|$)/.test(trimmed)) {
    return handleStart(chatId, trimmed);
  }

  const link = await getLink(chatId);
  if (!link) return notLinkedScreen();

  if (trimmed === "/logout") return handleLogout(link);
  if (trimmed === "/help" || trimmed === "/menu") return mainMenu(link.adminUser.email);

  // A pending custom-number prompt (tapped "Altro numero…") expects the next
  // message to be that number; anything else while linked just reopens the
  // menu instead of erroring — typing isn't the interface here. "invite_msg"
  // is the one pending action that isn't a number, so it's routed separately.
  if (link.pendingAction === "invite_msg") return handleSetInviteMessage(link, trimmed);
  if (link.pendingAction) return handlePendingNumber(link, trimmed, baseUrl);

  return mainMenu(link.adminUser.email);
}

export async function handleTelegramCallback(chatId: string, data: string, baseUrl: string): Promise<TelegramScreen> {
  const link = await getLink(chatId);
  if (!link) return notLinkedScreen();

  // Any button tap other than the prompt's own "Annulla" implicitly cancels
  // a pending custom-number prompt — otherwise the next unrelated thing the
  // user types would be misread as that stale number.
  if (link.pendingAction && data !== "cancelp") {
    await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
    link.pendingAction = null;
  }

  if (data === "main") return mainMenu(link.adminUser.email);
  if (data === "logout") return confirmMenu("Disconnettere questa chat dal tuo account Perla?", "logouty", "main");
  if (data === "logouty") return handleLogout(link);

  if (data === "events") return handleEvents(link);
  if (data.startsWith("ev:")) return handleSelectEventById(link, data.slice(3));
  if (data === "backev") return handleBackToEvent(link);

  if (data === "newq") return withEvent(link, () => newCodeQtyMenu());
  if (data.startsWith("newn:")) return handleCreateCodes(link, Number(data.slice(5)), baseUrl);
  if (data === "newc")
    return handleAskCustom(link, "new_qty", `Scrivi il numero di codici da creare (1-${MAX_NEW_CODES_PER_COMMAND}):`);

  if (data === "fwdstart") return handleForwardStart(link, baseUrl);
  if (data === "fwdnext") return handleForwardNext(link, baseUrl);

  if (data === "pubq") return withEvent(link, () => publicCodeMaxMenu());
  if (data.startsWith("pubn:")) return handleCreatePublicCode(link, Number(data.slice(5)), baseUrl);
  if (data === "pubc")
    return handleAskCustom(link, "pub_max", `Scrivi il numero massimo di utilizzi (0-${MAX_PUBLIC_USES}, 0 = illimitato):`);

  if (data === "editmsg")
    return handleAskCustom(
      link,
      "invite_msg",
      'Scrivi il nuovo messaggio da inoltrare ai partecipanti.\nSegnaposto: {link} (link di accesso), {event} (nome evento), {code} (codice).\nScrivi "-" per tornare al messaggio predefinito.',
    );

  if (data === "cancelp") return handleCancelPending(link);

  if (data === "list") return handleListCodes(link);
  if (data.startsWith("code:")) return handleCodeDetail(link, data.slice(5), baseUrl);
  if (data.startsWith("rvy:")) return handleRevoke(link, data.slice(4));
  if (data.startsWith("rv:")) return handleConfirmRevoke(link, data.slice(3));
  if (data.startsWith("rgy:")) return handleRegenerate(link, data.slice(4));
  if (data.startsWith("rg:")) return handleConfirmRegenerate(link, data.slice(3));

  return mainMenu(link.adminUser.email);
}

// ── Auth / linking ───────────────────────────────────────────────────────

async function handleStart(chatId: string, trimmed: string): Promise<TelegramScreen> {
  // Blunts brute-forcing someone else's API key by trying keys against a chat.
  const limit = rateLimit(rateLimitKey("telegram-start", chatId), { windowMs: 15 * 60_000, max: 10 });
  if (!limit.allowed) return { text: "⚠️ Troppi tentativi. Riprova tra qualche minuto.", keyboard: [] };

  const key = trimmed.split(/\s+/)[1];
  if (!key)
    return { text: "ℹ️ Uso: /start &lt;la tua API Key&gt; (la trovi in Perla → Account → API).", keyboard: [] };

  const adminUser = await verifyApiKey(key);
  if (!adminUser) return { text: "⚠️ Chiave non valida.", keyboard: [] };

  await prisma.telegramLink.upsert({
    where: { chatId },
    create: { chatId, adminUserId: adminUser.id },
    update: { adminUserId: adminUser.id, selectedEventId: null, pendingAction: null },
  });

  await writeAccessLog({ type: "admin_action", metadata: { action: "Collegamento bot Telegram", via: "telegram" } });
  return mainMenu(adminUser.email);
}

async function handleLogout(link: LinkedChat): Promise<TelegramScreen> {
  await prisma.telegramLink.deleteMany({ where: { chatId: link.chatId } });
  return loggedOutScreen();
}

// ── Events ───────────────────────────────────────────────────────────────

// Same filter/order as app/api/admin/events/route.ts's GET, so the list a
// user sees here matches what they'd see in the web app's events list.
async function eventsForUser(adminUser: AdminUser) {
  return prisma.event.findMany({
    where: adminUser.role === "admin" ? {} : { createdById: adminUser.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, internalName: true, status: true },
  });
}

async function handleEvents(link: LinkedChat): Promise<TelegramScreen> {
  return eventsMenu(await eventsForUser(link.adminUser));
}

async function handleSelectEventById(link: LinkedChat, eventId: string): Promise<TelegramScreen> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !assertOwnsEvent({ userId: link.adminUserId, role: link.adminUser.role }, event)) {
    return errorScreen("Evento non trovato.", "events", "🔙 I miei eventi");
  }
  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { selectedEventId: event.id } });
  return eventMenu(event);
}

// Re-verifies ownership fresh every time rather than trusting the stored
// selectedEventId blindly — an admin could have reassigned the event away
// from this user since it was selected.
async function requireSelectedEvent(link: LinkedChat): Promise<{ event: Event } | { error: TelegramScreen }> {
  if (!link.selectedEventId) return { error: errorScreen("Nessun evento selezionato.", "events", "🔙 I miei eventi") };
  const event = await prisma.event.findUnique({ where: { id: link.selectedEventId } });
  if (!event || !assertOwnsEvent({ userId: link.adminUserId, role: link.adminUser.role }, event)) {
    return { error: errorScreen("L'evento selezionato non è più disponibile.", "events", "🔙 I miei eventi") };
  }
  return { event };
}

async function withEvent(link: LinkedChat, screen: (event: Event) => TelegramScreen): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  return "error" in resolved ? resolved.error : screen(resolved.event);
}

async function handleBackToEvent(link: LinkedChat): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  return "error" in resolved ? resolved.error : eventMenu(resolved.event);
}

// ── Custom-input prompts (the only typing beyond /start) ────────────────

async function handleAskCustom(
  link: LinkedChat,
  action: "new_qty" | "pub_max" | "invite_msg",
  prompt: string,
): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;
  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: action } });
  return askCustomNumber(prompt);
}

async function handleCancelPending(link: LinkedChat): Promise<TelegramScreen> {
  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
  return handleBackToEvent(link);
}

async function handlePendingNumber(link: LinkedChat, text: string, baseUrl: string): Promise<TelegramScreen> {
  const n = Number(text.trim());

  if (link.pendingAction === "new_qty") {
    if (!Number.isInteger(n) || n < 1 || n > MAX_NEW_CODES_PER_COMMAND) {
      return askCustomNumber(`Numero non valido. Scrivi un numero tra 1 e ${MAX_NEW_CODES_PER_COMMAND}:`);
    }
    await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
    return handleCreateCodes(link, n, baseUrl);
  }

  if (link.pendingAction === "pub_max") {
    if (!Number.isInteger(n) || n < 0 || n > MAX_PUBLIC_USES) {
      return askCustomNumber(`Numero non valido. Scrivi un numero tra 0 e ${MAX_PUBLIC_USES} (0 = illimitato):`);
    }
    await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
    return handleCreatePublicCode(link, n, baseUrl);
  }

  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
  return mainMenu(link.adminUser.email);
}

// Mirrors app/api/admin/events/[id]/route.ts PATCH's inviteMessageTemplate
// handling. "-" clears it back to the app-wide default (DEFAULT_INVITE_MESSAGE_TEMPLATE)
// rather than requiring the admin to retype it from scratch.
async function handleSetInviteMessage(link: LinkedChat, text: string): Promise<TelegramScreen> {
  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingAction: null } });
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const trimmed = text.trim();
  if (trimmed === "-") {
    await prisma.event.update({ where: { id: resolved.event.id }, data: { inviteMessageTemplate: null } });
    await writeAccessLog({
      type: "admin_action",
      eventId: resolved.event.id,
      metadata: { action: "Messaggio di invito ripristinato al predefinito via Telegram" },
    });
    return actionResult("Messaggio predefinito ripristinato.", "backev", "🔙 Evento");
  }

  if (trimmed.length === 0 || trimmed.length > MAX_INVITE_MESSAGE_LENGTH) {
    return errorScreen(`Messaggio non valido (1-${MAX_INVITE_MESSAGE_LENGTH} caratteri).`, "backev", "🔙 Evento");
  }

  await prisma.event.update({ where: { id: resolved.event.id }, data: { inviteMessageTemplate: trimmed } });
  await writeAccessLog({
    type: "admin_action",
    eventId: resolved.event.id,
    metadata: { action: "Messaggio di invito personalizzato via Telegram" },
  });
  return actionResult("Messaggio salvato.", "backev", "🔙 Evento");
}

// ── Forwardable message ("Crea messaggio inoltrabile") ──────────────────
// Cycles through the codes just created (see handleCreateCodes, which stores
// them on TelegramLink.pendingForwardCodes), one message at a time so each
// one stays a single, cleanly forwardable Telegram message — no bot chrome
// mixed into the text, since forwarding a message forwards its text only,
// never the inline keyboard.

async function handleForwardStart(link: LinkedChat, baseUrl: string): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const codes = link.pendingForwardCodes ? link.pendingForwardCodes.split(",") : [];
  if (codes.length === 0) {
    return errorScreen("Nessun codice pronto da inoltrare — crea prima dei codici.", "backev", "🔙 Evento");
  }

  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingForwardIndex: 0 } });
  return forwardMessageScreen(resolved.event, codes[0], baseUrl, 0, codes.length);
}

async function handleForwardNext(link: LinkedChat, baseUrl: string): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const codes = link.pendingForwardCodes ? link.pendingForwardCodes.split(",") : [];
  const nextIndex = link.pendingForwardIndex + 1;
  if (codes.length === 0 || nextIndex >= codes.length) {
    return handleBackToEvent(link);
  }

  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { pendingForwardIndex: nextIndex } });
  return forwardMessageScreen(resolved.event, codes[nextIndex], baseUrl, nextIndex, codes.length);
}

// ── Codes ────────────────────────────────────────────────────────────────

// Mirrors app/api/admin/participants/route.ts POST — each personal code
// needs its own Participant row (created here with no display name).
async function handleCreateCodes(link: LinkedChat, count: number, baseUrl: string): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;
  if (!Number.isInteger(count) || count < 1 || count > MAX_NEW_CODES_PER_COMMAND) {
    return errorScreen(`Numero non valido (1-${MAX_NEW_CODES_PER_COMMAND}).`, "newq", "🔙 Indietro");
  }

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let saved = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const rec = buildCodeRecord();
      try {
        await prisma.participant.create({
          data: {
            eventId: resolved.event.id,
            inviteCodes: {
              create: {
                eventId: resolved.event.id,
                codeHash: rec.codeHash,
                codeEncrypted: rec.codeEncrypted,
                status: "valid",
                maxSessions: DEFAULTS.MAX_SESSIONS,
              },
            },
          },
        });
        codes.push(rec.code);
        saved = true;
        break;
      } catch {
        continue; // codeHash collision — astronomically unlikely, retry
      }
    }
    if (!saved) return errorScreen("Generazione fallita, riprova.", "backev", "🔙 Evento");
  }

  await writeAccessLog({
    type: "admin_action",
    eventId: resolved.event.id,
    metadata: { action: `${count} codice/i creato/i via Telegram` },
  });
  // Ready for "📤 Crea messaggio inoltrabile" (handleForwardStart) whether or
  // not the admin ever taps it — cheap to store, and codes never contain a
  // comma (see CODE_ALPHABET in lib/hash.ts) so the join is unambiguous.
  await prisma.telegramLink.update({
    where: { chatId: link.chatId },
    data: { pendingForwardCodes: codes.join(","), pendingForwardIndex: 0 },
  });
  return newCodesResult(resolved.event.internalName, codes, baseUrl);
}

// Mirrors app/api/admin/codes/public/route.ts POST. maxSessions === UNLIMITED_SESSIONS (0)
// means no cap — see lib/constants.ts's publicCodeCapReached, which every enforcement
// point (lib/code-resolution.ts, app/api/session/start/route.ts) already honors.
async function handleCreatePublicCode(link: LinkedChat, maxSessions: number, baseUrl: string): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;
  if (!Number.isInteger(maxSessions) || maxSessions < 0 || maxSessions > MAX_PUBLIC_USES) {
    return errorScreen(`Numero non valido (0-${MAX_PUBLIC_USES}, 0 = illimitato).`, "pubq", "🔙 Indietro");
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();
    try {
      await prisma.inviteCode.create({
        data: {
          eventId: resolved.event.id,
          codeHash: rec.codeHash,
          codeEncrypted: rec.codeEncrypted,
          status: "valid",
          isPublic: true,
          maxSessions,
        },
      });
      await writeAccessLog({
        type: "admin_action",
        eventId: resolved.event.id,
        metadata: { action: "Codice pubblico creato via Telegram" },
      });
      return publicCodeResult(resolved.event.internalName, rec.code, maxSessions, baseUrl);
    } catch {
      continue;
    }
  }
  return errorScreen("Generazione fallita, riprova.", "backev", "🔙 Evento");
}

// Mirrors app/api/admin/codes/route.ts GET.
async function handleListCodes(link: LinkedChat): Promise<TelegramScreen> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const [codes, totalCount] = await Promise.all([
    prisma.inviteCode.findMany({
      where: { eventId: resolved.event.id },
      orderBy: { createdAt: "desc" },
      take: CODES_LIST_LIMIT,
      include: { participant: true },
    }),
    prisma.inviteCode.count({ where: { eventId: resolved.event.id } }),
  ]);

  return codesListMenu(
    resolved.event.internalName,
    codes.map((c) => ({ ...c, plainCode: decryptCode(c.codeEncrypted) })),
    totalCount,
  );
}

async function findOwnedCode(
  link: LinkedChat,
  codeId: string,
): Promise<{ error: TelegramScreen } | { event: Event; code: InviteCode }> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return { error: resolved.error };
  const code = await prisma.inviteCode.findFirst({ where: { id: codeId, eventId: resolved.event.id } });
  if (!code) return { error: errorScreen("Codice non trovato in questo evento.", "list", "🔙 Lista codici") };
  return { event: resolved.event, code };
}

async function handleCodeDetail(link: LinkedChat, codeId: string, baseUrl: string): Promise<TelegramScreen> {
  const found = await findOwnedCode(link, codeId);
  if ("error" in found) return found.error;
  return codeDetailMenu(found.event.internalName, { ...found.code, plainCode: decryptCode(found.code.codeEncrypted) }, baseUrl);
}

// Mirrors app/api/admin/codes/[id]/revoke/route.ts POST.
async function handleConfirmRevoke(link: LinkedChat, codeId: string): Promise<TelegramScreen> {
  const found = await findOwnedCode(link, codeId);
  if ("error" in found) return found.error;
  return confirmMenu(
    `Revocare il codice <code>${decryptCode(found.code.codeEncrypted)}</code>? Non sarà più utilizzabile.`,
    `rvy:${codeId}`,
    `code:${codeId}`,
  );
}

async function handleRevoke(link: LinkedChat, codeId: string): Promise<TelegramScreen> {
  const found = await findOwnedCode(link, codeId);
  if ("error" in found) return found.error;

  await prisma.inviteCode.update({ where: { id: codeId }, data: { status: "revoked", revokedAt: new Date() } });
  await prisma.session.updateMany({ where: { inviteCodeId: codeId, status: "active" }, data: { status: "expired" } });

  await writeAccessLog({
    type: "admin_action",
    eventId: found.event.id,
    inviteCodeId: codeId,
    metadata: { action: "Codice revocato via Telegram" },
  });
  return actionResult("Codice revocato.", "list");
}

// Mirrors app/api/admin/codes/[id]/regenerate/route.ts POST.
async function handleConfirmRegenerate(link: LinkedChat, codeId: string): Promise<TelegramScreen> {
  const found = await findOwnedCode(link, codeId);
  if ("error" in found) return found.error;
  return confirmMenu(
    `Rigenerare il codice <code>${decryptCode(found.code.codeEncrypted)}</code>? Il vecchio smette subito di funzionare.`,
    `rgy:${codeId}`,
    `code:${codeId}`,
  );
}

async function handleRegenerate(link: LinkedChat, codeId: string): Promise<TelegramScreen> {
  const found = await findOwnedCode(link, codeId);
  if ("error" in found) return found.error;

  await prisma.session.updateMany({ where: { inviteCodeId: codeId, status: "active" }, data: { status: "expired" } });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();
    try {
      await prisma.inviteCode.update({
        where: { id: codeId },
        data: {
          codeHash: rec.codeHash,
          codeEncrypted: rec.codeEncrypted,
          status: "valid",
          activatedAt: null,
          completedAt: null,
          revokedAt: null,
        },
      });
      if (found.code.participantId) {
        await prisma.participant.update({ where: { id: found.code.participantId }, data: { status: "not_started" } });
      }
      await writeAccessLog({
        type: "admin_action",
        eventId: found.event.id,
        inviteCodeId: codeId,
        metadata: { action: "Codice rigenerato via Telegram" },
      });
      return actionResult(`Nuovo codice: <code>${rec.code}</code>`, "list");
    } catch {
      continue;
    }
  }
  return errorScreen("Rigenerazione fallita, riprova.", "list", "🔙 Lista codici");
}
