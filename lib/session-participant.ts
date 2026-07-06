// Participant session + device token handling.
//
// The device token is stored as an httpOnly cookie (not localStorage, as
// the spec's "cookie or localStorage" wording allows) so it cannot be read
// or copied via page JS — it is the binding that enforces "one code, one
// device". The participant session cookie carries the raw session token
// inside a signed JWT so the server can verify integrity without a DB hit
// just to detect tampering; the DB itself only ever stores the token's
// SHA-256 hash.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/constants";
import { generateRandomToken, sha256Hex } from "@/lib/hash";
import { prisma } from "@/lib/db";

const DEVICE_TOKEN_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year
const PARTICIPANT_SESSION_MAX_AGE_S = 60 * 60 * 24; // 24h ceiling; events end sessions earlier

function getParticipantSecret(): Uint8Array {
  const secret = process.env.PARTICIPANT_SESSION_SECRET;
  if (!secret) throw new Error("PARTICIPANT_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function getOrCreateDeviceToken(): Promise<{ raw: string; hash: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAMES.DEVICE_TOKEN)?.value;
  if (existing) {
    return { raw: existing, hash: sha256Hex(existing), isNew: false };
  }

  const raw = generateRandomToken();
  cookieStore.set(COOKIE_NAMES.DEVICE_TOKEN, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DEVICE_TOKEN_MAX_AGE_S,
  });
  return { raw, hash: sha256Hex(raw), isNew: true };
}

export async function getDeviceTokenHashFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAMES.DEVICE_TOKEN)?.value;
  return existing ? sha256Hex(existing) : null;
}

export async function issueParticipantSession(params: {
  sessionId: string;
  sessionTokenRaw: string;
  participantCode?: string | null;
}): Promise<void> {
  const token = await new SignJWT({ sid: params.sessionId, participantCode: params.participantCode ?? undefined })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.sessionTokenRaw)
    .setIssuedAt()
    .setExpirationTime(`${PARTICIPANT_SESSION_MAX_AGE_S}s`)
    .sign(getParticipantSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.PARTICIPANT_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: PARTICIPANT_SESSION_MAX_AGE_S,
  });
}

export async function clearParticipantSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.PARTICIPANT_SESSION);
  cookieStore.delete(COOKIE_NAMES.CODE_REF);
}

async function readParticipantSessionToken(): Promise<{
  sessionId: string;
  sessionTokenRaw: string;
  participantCode: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.PARTICIPANT_SESSION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getParticipantSecret());
    if (!payload.sub || typeof payload.sid !== "string") return null;
    return {
      sessionId: payload.sid,
      sessionTokenRaw: payload.sub,
      participantCode: typeof payload.participantCode === "string" ? payload.participantCode : null,
    };
  } catch {
    return null;
  }
}

// Resolves the full DB context for the current participant session cookie.
// This is the only place `/api/session/*` routes should use to look up
// "who is this participant" — it re-validates the JWT against the DB hash
// on every call rather than trusting the cookie payload alone.
export async function getParticipantSessionContext() {
  const tokenPayload = await readParticipantSessionToken();
  if (!tokenPayload) return null;

  const sessionTokenHash = sha256Hex(tokenPayload.sessionTokenRaw);

  const session = await prisma.session.findUnique({
    where: { sessionTokenHash },
    include: {
      participant: true,
      inviteCode: { include: { event: true } },
    },
  });

  if (!session || session.id !== tokenPayload.sessionId) return null;
  return { ...session, participantCode: tokenPayload.participantCode };
}

export type ParticipantSessionContext = NonNullable<Awaited<ReturnType<typeof getParticipantSessionContext>>>;

export async function deviceTokenMatchesSession(session: { deviceTokenHash: string }): Promise<boolean> {
  const hash = await getDeviceTokenHashFromCookie();
  return hash !== null && hash === session.deviceTokenHash;
}

// Short-lived reference set right after a successful code verify so the
// participant flow page doesn't need the code re-typed; it carries only
// the invite code id, signed, never the code itself.
export async function issueCodeRef(
  inviteCode: { id: string; codeHash: string; codeDisplay: string },
  ttlMinutes: number,
): Promise<void> {
  const token = await new SignJWT({ codeHash: inviteCode.codeHash, codeDisplay: inviteCode.codeDisplay })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(inviteCode.id)
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(getParticipantSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.CODE_REF, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ttlMinutes * 60,
  });
}

export async function readCodeRef(): Promise<{
  inviteCodeId: string;
  codeHash: string;
  codeDisplay: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.CODE_REF)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getParticipantSecret());
    if (!payload.sub || typeof payload.codeHash !== "string" || typeof payload.codeDisplay !== "string") {
      return null;
    }
    return { inviteCodeId: payload.sub, codeHash: payload.codeHash, codeDisplay: payload.codeDisplay };
  } catch {
    return null;
  }
}
