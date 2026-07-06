// Builds the stored representation of an invite code. The hash is used for
// lookup, while the encrypted copy is only displayed to authenticated admins.
import { encrypt } from "@/lib/crypto";
import { generateRandomCode, hashCodeWithPepper, normalizeCode } from "@/lib/hash";

export interface CodeRecord {
  code: string; // normalized plaintext (uppercase, no spaces)
  codeHash: string;
  codeEncrypted: string;
}

export function buildCodeRecord(plain?: string): CodeRecord {
  const code = normalizeCode(plain ?? generateRandomCode(8));
  return {
    code,
    codeHash: hashCodeWithPepper(code),
    codeEncrypted: encrypt(code),
  };
}
