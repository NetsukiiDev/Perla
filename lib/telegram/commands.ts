// Telegram bot command router. Every handler below reuses the exact same
// Prisma operations as the equivalent admin API route (see the route files
// under app/api/admin/{events,participants,codes}/*) rather than duplicating
// business logic — this file only adds the chat-command parsing and the
// Telegram-specific "which event is this chat currently working on" state.
import { prisma } from "@/lib/db";
import { assertOwnsEvent } from "@/lib/admin-guard";
import { verifyApiKey } from "@/lib/api-key";
import { buildCodeRecord } from "@/lib/invite-code";
import { decrypt } from "@/lib/crypto";
import { normalizeCode, hashCodeWithPepper } from "@/lib/hash";
import { DEFAULTS } from "@/lib/constants";
import { writeAccessLog } from "@/lib/access-log";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import type { AdminUser, Event } from "@/lib/generated/prisma/client";

const MAX_ATTEMPTS = 5;
const MAX_NEW_CODES_PER_COMMAND = 20;

interface LinkedChat {
  chatId: string;
  adminUserId: string;
  selectedEventId: string | null;
  adminUser: AdminUser;
}

const HELP_TEXT = [
  "Comandi disponibili:",
  "/start <chiave> — collega questa chat al tuo account Perla (chiave da Account → API)",
  "/logout — scollega questa chat",
  "/eventi — elenca i tuoi eventi",
  "/usa <numero> — seleziona su quale evento agire (vedi /eventi)",
  "/nuovo [numero] — crea N codici personali per l'evento selezionato (default 1)",
  "/pubblico [max utilizzi] — crea un codice pubblico riutilizzabile (default 100)",
  "/lista — elenca i codici dell'evento selezionato",
  "/revoca <codice> — revoca un codice",
  "/rigenera <codice> — sostituisce un codice con uno nuovo",
  "/help — questo elenco",
].join("\n");

export async function handleTelegramMessage(chatId: string, text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) {
    return "Non ho capito. Scrivi /help per l'elenco dei comandi.";
  }

  const [rawCommand, ...args] = trimmed.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@.*$/, ""); // strip a possible "@BotUsername" suffix

  if (command === "/help") return HELP_TEXT;
  if (command === "/start" || command === "/link") return handleStart(chatId, args);

  const link = await prisma.telegramLink.findUnique({ where: { chatId }, include: { adminUser: true } });
  if (!link) {
    return "Non sei collegato. Genera una API Key da Perla (Account → API) e scrivi /start <chiave>.";
  }

  switch (command) {
    case "/logout":
      return handleLogout(chatId);
    case "/eventi":
      return handleListEvents(link.adminUser);
    case "/usa":
      return handleSelectEvent(link, args);
    case "/nuovo":
      return handleCreateCodes(link, args);
    case "/pubblico":
      return handleCreatePublicCode(link, args);
    case "/lista":
      return handleListCodes(link);
    case "/revoca":
      return handleRevoke(link, args);
    case "/rigenera":
      return handleRegenerate(link, args);
    default:
      return "Comando sconosciuto. Scrivi /help per l'elenco dei comandi.";
  }
}

async function handleStart(chatId: string, args: string[]): Promise<string> {
  // Blunts brute-forcing someone else's API key by trying keys against a chat.
  const limit = rateLimit(rateLimitKey("telegram-start", chatId), { windowMs: 15 * 60_000, max: 10 });
  if (!limit.allowed) return "Troppi tentativi. Riprova tra qualche minuto.";

  const key = args[0];
  if (!key) return "Uso: /start <la tua API Key> (la trovi in Perla → Account → API).";

  const adminUser = await verifyApiKey(key);
  if (!adminUser) return "Chiave non valida.";

  await prisma.telegramLink.upsert({
    where: { chatId },
    create: { chatId, adminUserId: adminUser.id },
    update: { adminUserId: adminUser.id, selectedEventId: null },
  });

  await writeAccessLog({ type: "admin_action", metadata: { action: "Collegamento bot Telegram", via: "telegram" } });
  return `Collegato come ${adminUser.email}. Scrivi /eventi per iniziare.`;
}

async function handleLogout(chatId: string): Promise<string> {
  await prisma.telegramLink.deleteMany({ where: { chatId } });
  return "Disconnesso.";
}

// Same filter/order as app/api/admin/events/route.ts's GET, so the numbering
// a user sees here matches what they'd see in the web app's events list.
async function eventsForUser(adminUser: AdminUser) {
  return prisma.event.findMany({
    where: adminUser.role === "admin" ? {} : { createdById: adminUser.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, internalName: true, status: true },
  });
}

async function handleListEvents(adminUser: AdminUser): Promise<string> {
  const events = await eventsForUser(adminUser);
  if (events.length === 0) return "Nessun evento disponibile.";
  const lines = events.map((e, i) => `${i + 1}. ${e.internalName} (${e.status})`);
  return `Eventi:\n${lines.join("\n")}\n\nUsa /usa <numero> per selezionarne uno.`;
}

async function handleSelectEvent(link: LinkedChat, args: string[]): Promise<string> {
  const index = Number(args[0]);
  if (!Number.isInteger(index) || index < 1) return "Uso: /usa <numero> (vedi /eventi).";

  const events = await eventsForUser(link.adminUser);
  const event = events[index - 1];
  if (!event) return "Numero non valido. Scrivi /eventi per la lista aggiornata.";

  await prisma.telegramLink.update({ where: { chatId: link.chatId }, data: { selectedEventId: event.id } });
  return `Evento selezionato: ${event.internalName}.`;
}

// Re-verifies ownership fresh every time rather than trusting the stored
// selectedEventId blindly — an admin could have reassigned the event away
// from this user since it was selected.
async function requireSelectedEvent(link: LinkedChat): Promise<{ event: Event } | { error: string }> {
  if (!link.selectedEventId) return { error: "Nessun evento selezionato. Scrivi /eventi e poi /usa <numero>." };
  const event = await prisma.event.findUnique({ where: { id: link.selectedEventId } });
  if (!event || !assertOwnsEvent({ userId: link.adminUserId, role: link.adminUser.role }, event)) {
    return { error: "L'evento selezionato non è più disponibile. Scrivi /eventi per sceglierne un altro." };
  }
  return { event };
}

// Mirrors app/api/admin/participants/route.ts POST — each personal code
// needs its own Participant row (created here with no display name).
async function handleCreateCodes(link: LinkedChat, args: string[]): Promise<string> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const count = args[0] ? Number(args[0]) : 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_NEW_CODES_PER_COMMAND) {
    return `Uso: /nuovo [numero] (1-${MAX_NEW_CODES_PER_COMMAND}).`;
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
    if (!saved) return "Generazione fallita, riprova.";
  }

  await writeAccessLog({
    type: "admin_action",
    eventId: resolved.event.id,
    metadata: { action: `${count} codice/i creato/i via Telegram` },
  });
  return `Creati ${count} codice/i per "${resolved.event.internalName}":\n${codes.join("\n")}`;
}

// Mirrors app/api/admin/codes/public/route.ts POST.
async function handleCreatePublicCode(link: LinkedChat, args: string[]): Promise<string> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const maxSessions = args[0] ? Number(args[0]) : 100;
  if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 10000) {
    return "Uso: /pubblico [numero utilizzi] (1-10000).";
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
      return `Codice pubblico creato per "${resolved.event.internalName}" (max ${maxSessions} utilizzi): ${rec.code}`;
    } catch {
      continue;
    }
  }
  return "Generazione fallita, riprova.";
}

// Mirrors app/api/admin/codes/route.ts GET.
async function handleListCodes(link: LinkedChat): Promise<string> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;

  const codes = await prisma.inviteCode.findMany({
    where: { eventId: resolved.event.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { participant: true },
  });
  if (codes.length === 0) return `Nessun codice per "${resolved.event.internalName}".`;

  const lines = codes.map((c) => {
    let plain = "?";
    if (c.codeEncrypted) {
      try {
        plain = decrypt(c.codeEncrypted);
      } catch {
        plain = "(illeggibile)";
      }
    }
    const who = c.isPublic ? "pubblico" : c.participant?.displayName || "—";
    return `${plain} — ${c.status} (${who})`;
  });
  return `Codici per "${resolved.event.internalName}" (ultimi ${codes.length}):\n${lines.join("\n")}`;
}

async function findCodeInEvent(eventId: string, rawCode: string) {
  const hash = hashCodeWithPepper(normalizeCode(rawCode));
  return prisma.inviteCode.findFirst({ where: { eventId, codeHash: hash } });
}

// Mirrors app/api/admin/codes/[id]/revoke/route.ts POST.
async function handleRevoke(link: LinkedChat, args: string[]): Promise<string> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;
  if (!args[0]) return "Uso: /revoca <codice>.";

  const inviteCode = await findCodeInEvent(resolved.event.id, args[0]);
  if (!inviteCode) return "Codice non trovato in questo evento.";

  await prisma.inviteCode.update({ where: { id: inviteCode.id }, data: { status: "revoked", revokedAt: new Date() } });
  await prisma.session.updateMany({ where: { inviteCodeId: inviteCode.id, status: "active" }, data: { status: "expired" } });

  await writeAccessLog({
    type: "admin_action",
    eventId: resolved.event.id,
    inviteCodeId: inviteCode.id,
    metadata: { action: "Codice revocato via Telegram" },
  });
  return "Codice revocato.";
}

// Mirrors app/api/admin/codes/[id]/regenerate/route.ts POST.
async function handleRegenerate(link: LinkedChat, args: string[]): Promise<string> {
  const resolved = await requireSelectedEvent(link);
  if ("error" in resolved) return resolved.error;
  if (!args[0]) return "Uso: /rigenera <codice>.";

  const inviteCode = await findCodeInEvent(resolved.event.id, args[0]);
  if (!inviteCode) return "Codice non trovato in questo evento.";

  await prisma.session.updateMany({ where: { inviteCodeId: inviteCode.id, status: "active" }, data: { status: "expired" } });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();
    try {
      await prisma.inviteCode.update({
        where: { id: inviteCode.id },
        data: { codeHash: rec.codeHash, codeEncrypted: rec.codeEncrypted, status: "valid", activatedAt: null, completedAt: null, revokedAt: null },
      });
      if (inviteCode.participantId) {
        await prisma.participant.update({ where: { id: inviteCode.participantId }, data: { status: "not_started" } });
      }
      await writeAccessLog({
        type: "admin_action",
        eventId: resolved.event.id,
        inviteCodeId: inviteCode.id,
        metadata: { action: "Codice rigenerato via Telegram" },
      });
      return `Nuovo codice: ${rec.code}`;
    } catch {
      continue;
    }
  }
  return "Rigenerazione fallita, riprova.";
}
