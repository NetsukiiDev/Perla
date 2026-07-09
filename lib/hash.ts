// Hashing helpers. Invite codes, session tokens, device tokens, IP and
// user-agent are stored only as hashes — never in plaintext.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// Used only for invite codes: low-entropy human-typed strings need a server
// secret mixed in so a DB dump alone can't be brute-forced offline.
export function hashCodeWithPepper(code: string): string {
  const pepper = process.env.HASH_PEPPER;
  if (!pepper) throw new Error("HASH_PEPPER is not set");
  return sha256Hex(`${code}:${pepper}`);
}

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// No ambiguous characters (0/O, 1/I/L) so codes are easy to read/type back.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRandomCode(length = 8): string {
  const alphabetLength = CODE_ALPHABET.length;
  // Reject bytes in the biased tail so `byte % alphabetLength` is uniform.
  // Without this, 256 % 31 != 0 makes the first few characters more likely
  // (modulo bias — CWE-327). Rejection sampling keeps every char equiprobable.
  const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength;
  let out = "";
  while (out.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= maxUnbiased) continue;
    out += CODE_ALPHABET[byte % alphabetLength];
  }
  return out;
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}
