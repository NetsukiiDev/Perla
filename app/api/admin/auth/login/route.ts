import { NextResponse } from "next/server";
import { writeAccessLog } from "@/lib/access-log";
import { issueAdminSession } from "@/lib/auth-admin";
import { prisma } from "@/lib/db";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { verifyPassword } from "@/lib/hash";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { requestUrl } from "@/lib/request-url";
import { adminLoginSchema } from "@/lib/validation/admin-auth";
import { decrypt } from "@/lib/crypto";

const DEFAULT_NEXT_PATH = "/admin/events";
const DUMMY_PASSWORD_HASH = "$2b$12$kIdl3wTFE/UvJbLCE57toeFVrBS4KUA6nEEMSRB2SQZnaU7Hlp.Jy";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type LoginRequest =
  | { kind: "json"; body: unknown; next: null }
  | { kind: "form"; body: unknown; next: FormDataEntryValue | null };

function safeNextPath(value: FormDataEntryValue | string | null | undefined): string {
  const path = typeof value === "string" ? value : "";
  if (!path || !path.startsWith("/") || path.startsWith("//")) return DEFAULT_NEXT_PATH;
  return path;
}

function redirectToLogin(req: Request, error: "invalid" | "rate_limited" | "captcha_failed", next: FormDataEntryValue | null) {
  const url = requestUrl(req, "/admin/login");
  url.searchParams.set("error", error);

  const nextPath = safeNextPath(next);
  if (nextPath !== DEFAULT_NEXT_PATH) {
    url.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(url, 303);
}

function redirectAfterLogin(req: Request, next: FormDataEntryValue | null) {
  return NextResponse.redirect(requestUrl(req, safeNextPath(next)), 303);
}

async function readLoginRequest(req: Request): Promise<LoginRequest & { turnstileToken: string | null }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return {
      kind: "json",
      body,
      next: null,
      turnstileToken: body?.turnstileToken ?? null,
    };
  }

  const formData = await req.formData().catch(() => null);
  return {
    kind: "form",
    body: formData
      ? {
          email: formData.get("email"),
          password: formData.get("password"),
        }
      : null,
    next: formData?.get("next") ?? null,
    turnstileToken: (formData?.get("cf-turnstile-response") as string | null) ?? null,
  };
}

function errorResponse(req: Request, loginReq: LoginRequest, error: "invalid" | "rate_limited" | "captcha_failed", status: number) {
  if (loginReq.kind === "form") {
    return redirectToLogin(req, error, loginReq.next);
  }
  return NextResponse.json({ error }, { status });
}

// Returns the Turnstile secret when the CAPTCHA is configured (DB config or
// env), or null when it isn't — in which case login must NOT require a token.
async function resolveTurnstileSecret(): Promise<string | null> {
  try {
    const cfg = await prisma.turnstileConfig.findUnique({ where: { id: "default" } });
    if (cfg?.enabled && cfg.secretKeyEncrypted) {
      return decrypt(cfg.secretKeyEncrypted);
    }
  } catch {
    // turnstile_config table may not exist yet (migration not run) — never let
    // that break login; fall back to the env secret (or none).
  }
  return process.env.TURNSTILE_SECRET_KEY ?? null;
}

async function verifyTurnstileToken(secretKey: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const loginReq = await readLoginRequest(req);

  // Only enforce the CAPTCHA when Turnstile is actually configured. Without
  // this, login would be permanently blocked whenever Turnstile is disabled
  // (the client never produces a token, so no token is ever sent).
  const turnstileSecret = await resolveTurnstileSecret();
  if (turnstileSecret) {
    if (!loginReq.turnstileToken || !(await verifyTurnstileToken(turnstileSecret, loginReq.turnstileToken))) {
      return errorResponse(req, loginReq, "captcha_failed", 400);
    }
  }

  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "admin-login"), { windowMs: 15 * 60_000, max: 5 });
  if (!limit.allowed) {
    return errorResponse(req, loginReq, "rate_limited", 429);
  }

  const parsed = adminLoginSchema.safeParse(loginReq.body);
  if (!parsed.success) {
    return errorResponse(req, loginReq, "invalid", 400);
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !valid) {
    await writeAccessLog({ type: AccessLogType.admin_login_failed, metadata: { email: parsed.data.email } });
    return errorResponse(req, loginReq, "invalid", 401);
  }

  await issueAdminSession({ id: user.id, role: user.role });
  await writeAccessLog({ type: AccessLogType.admin_login, metadata: { userId: user.id } });

  if (loginReq.kind === "form") {
    return redirectAfterLogin(req, loginReq.next);
  }

  return NextResponse.json({ ok: true });
}
