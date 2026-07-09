// POST /api/code/verify resolves a raw code to its event/participant.
// JSON callers receive the historical minimal ok/error payload. Native HTML
// form submissions receive a 303 redirect so the public code form works even
// before client JavaScript hydrates.
import { NextResponse } from "next/server";
import { writeAccessLog } from "@/lib/access-log";
import { evaluateInviteCodeState } from "@/lib/code-resolution";
import { DEFAULTS, getErrorMessages } from "@/lib/constants";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { prisma } from "@/lib/db";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { hashCodeWithPepper, normalizeCode } from "@/lib/hash";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { requestUrl } from "@/lib/request-url";
import { clearParticipantSession, getOrCreateDeviceToken, issueCodeRef } from "@/lib/session-participant";
import { codeVerifySchema } from "@/lib/validation/code";

type CodeVerifyRequest =
  | { kind: "json"; body: unknown }
  | { kind: "form"; body: unknown };

async function readCodeVerifyRequest(req: Request): Promise<CodeVerifyRequest> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return { kind: "json", body: await req.json().catch(() => null) };
  }

  const formData = await req.formData().catch(() => null);
  return { kind: "form", body: formData ? { code: formData.get("code") } : null };
}

function redirectToHome(req: Request, error: "already_used" | "invalid" | "not_available" | "rate_limited") {
  const url = requestUrl(req, "/");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

function failureResponse(
  req: Request,
  codeReq: CodeVerifyRequest,
  error: "already_used" | "invalid" | "not_available" | "rate_limited",
  message: string,
  status = 200,
) {
  if (codeReq.kind === "form") {
    return redirectToHome(req, error);
  }
  return NextResponse.json({ ok: false, error, message }, { status });
}

function successResponse(req: Request, codeReq: CodeVerifyRequest) {
  if (codeReq.kind === "form") {
    return NextResponse.redirect(requestUrl(req, "/c"), 303);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const E = getErrorMessages(t);
  const codeReq = await readCodeVerifyRequest(req);

  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "code-verify"), { windowMs: 5 * 60_000, max: 10 });
  if (!limit.allowed) {
    return failureResponse(req, codeReq, "rate_limited", E.INVALID_CODE, 429);
  }

  const parsed = codeVerifySchema.safeParse(codeReq.body);
  if (!parsed.success) {
    return failureResponse(req, codeReq, "invalid", E.INVALID_CODE, 400);
  }

  const normalizedCode = normalizeCode(parsed.data.code);
  const codeHash = hashCodeWithPepper(normalizedCode);

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { codeHash },
    include: { event: true },
  });

  if (!inviteCode) {
    await writeAccessLog({ type: AccessLogType.code_verify_invalid });
    return failureResponse(req, codeReq, "invalid", E.INVALID_CODE);
  }

  await getOrCreateDeviceToken();

  await writeAccessLog({
    type: AccessLogType.code_verify_success,
    eventId: inviteCode.eventId,
    participantId: inviteCode.participantId,
    inviteCodeId: inviteCode.id,
  });

  const state = await evaluateInviteCodeState(inviteCode, inviteCode.event, t, normalizedCode);

  if (state.kind === "not_available") {
    await writeAccessLog({
      type: AccessLogType.code_not_available,
      eventId: inviteCode.eventId,
      participantId: inviteCode.participantId,
      inviteCodeId: inviteCode.id,
    });
    return failureResponse(req, codeReq, "not_available", E.CODE_NOT_AVAILABLE);
  }

  if (state.kind === "already_used") {
    await writeAccessLog({
      type: AccessLogType.code_verify_already_used,
      eventId: inviteCode.eventId,
      participantId: inviteCode.participantId,
      inviteCodeId: inviteCode.id,
    });
    return failureResponse(req, codeReq, "already_used", E.ALREADY_USED);
  }

  if (state.kind === "not_yet_available") {
    await writeAccessLog({
      type: AccessLogType.code_not_yet_available,
      eventId: inviteCode.eventId,
      participantId: inviteCode.participantId,
      inviteCodeId: inviteCode.id,
    });
  }

  // needs_consent / in_progress / arrived (resumed session) all proceed.
  // A browser may be testing multiple invite codes. Drop an older participant
  // session so /c resolves the freshly verified code_ref instead of stale state.
  await clearParticipantSession();
  await issueCodeRef(
    { id: inviteCode.id, codeHash: inviteCode.codeHash, codeDisplay: normalizedCode },
    DEFAULTS.CODE_REF_TTL_MIN,
  );
  return successResponse(req, codeReq);
}
