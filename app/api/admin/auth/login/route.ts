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

const DEFAULT_NEXT_PATH = "/admin/events";
const DUMMY_PASSWORD_HASH = "$2b$12$kIdl3wTFE/UvJbLCE57toeFVrBS4KUA6nEEMSRB2SQZnaU7Hlp.Jy";

type LoginRequest =
  | { kind: "json"; body: unknown; next: null }
  | { kind: "form"; body: unknown; next: FormDataEntryValue | null };

function safeNextPath(value: FormDataEntryValue | string | null | undefined): string {
  const path = typeof value === "string" ? value : "";
  if (!path || !path.startsWith("/") || path.startsWith("//")) return DEFAULT_NEXT_PATH;
  return path;
}

function redirectToLogin(req: Request, error: "invalid" | "rate_limited", next: FormDataEntryValue | null) {
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

async function readLoginRequest(req: Request): Promise<LoginRequest> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return { kind: "json", body: await req.json().catch(() => null), next: null };
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
  };
}

function errorResponse(req: Request, loginReq: LoginRequest, error: "invalid" | "rate_limited", status: number) {
  if (loginReq.kind === "form") {
    return redirectToLogin(req, error, loginReq.next);
  }
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const loginReq = await readLoginRequest(req);

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
