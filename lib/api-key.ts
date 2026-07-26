// Personal API keys for external integrations (currently: the Telegram
// bot). Same security posture as invite codes and passwords — only a hash
// is ever persisted; the plaintext is returned once, at generation time,
// and can never be read back.
import { prisma } from "@/lib/db";
import { sha256Hex, generateRandomToken } from "@/lib/hash";
import type { AdminUser } from "@/lib/generated/prisma/client";

export interface GeneratedApiKey {
  key: string;
  keyHash: string;
}

// "pk_" prefix makes the key recognizable at a glance in logs/screenshots
// without revealing anything about its value.
export function generateApiKey(): GeneratedApiKey {
  const key = `pk_${generateRandomToken(24)}`;
  return { key, keyHash: sha256Hex(key) };
}

// Looks up the owning admin/organizer for a raw key presented by a caller
// (e.g. Telegram's /start <key>), bumping lastUsedAt on success. Returns
// null for any unknown or malformed key — never throws on bad input.
export async function verifyApiKey(rawKey: string): Promise<AdminUser | null> {
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: sha256Hex(trimmed) },
    include: { adminUser: true },
  });
  if (!record) return null;

  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return record.adminUser;
}
