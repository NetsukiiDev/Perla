// Outbound email via the admin-configured SMTP server (lib SmtpConfig).
// Passwords are stored AES-256-GCM encrypted; they are only decrypted here,
// at send time. All sends are best-effort: a failure is returned to the
// caller rather than throwing, so password-reset flows can surface a clean
// error instead of crashing the request.
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { SmtpConfig } from "@/lib/generated/prisma/client";

export type SmtpConfigInput = {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
  fromName?: string | null;
  fromEmail: string;
  enabled: boolean;
};

// Loads the singleton SMTP config (or null when never configured).
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    return await prisma.smtpConfig.findUnique({ where: { id: "default" } });
  } catch (err) {
    // Logged so a DB outage doesn't look identical to "never configured" in
    // the server logs, even though callers still just see null.
    console.error("Failed to load SMTP config", err instanceof Error ? err.message : err);
    return null;
  }
}

// Builds a configured transporter from the stored config.
// { transport: null, reason: "not_configured" } when SMTP is disabled/unset;
// { transport: null, reason: "decrypt_failed" } when the stored password was
// encrypted with a since-rotated ENCRYPTION_KEY and can never be read back —
// distinct from other failures so callers (password-reset, the Settings test
// button) can point the admin at re-entering it instead of a generic error.
export async function buildSmtpTransport(): Promise<
  { transport: Transporter; reason?: undefined } | { transport: null; reason: "not_configured" | "decrypt_failed" }
> {
  const cfg = await getSmtpConfig();
  if (!cfg || !cfg.enabled) return { transport: null, reason: "not_configured" };

  let pass: string | undefined;
  if (cfg.passwordEncrypted) {
    try {
      pass = decrypt(cfg.passwordEncrypted);
    } catch (err) {
      // ENCRYPTION_KEY changed — stored password is unreadable. Logged so
      // this doesn't look identical to "SMTP disabled" in the server logs;
      // the fix is re-entering the password from Settings.
      console.error("Stored SMTP password is unreadable (ENCRYPTION_KEY mismatch?)", err instanceof Error ? err.message : err);
      return { transport: null, reason: "decrypt_failed" };
    }
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    // When not using implicit TLS (secure=false, typically port 587),
    // require STARTTLS so we never send over a plaintext connection.
    requireTLS: !cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass } : undefined,
  });
  return { transport };
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Resolves the "From" header from the stored config.
export function smtpFromAddress(cfg: SmtpConfig): string {
  if (cfg.fromName) return `"${cfg.fromName}" <${cfg.fromEmail}>`;
  return cfg.fromEmail;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
  /** Set only when the stored SMTP password can't be decrypted — see buildSmtpTransport. */
  decryptFailed?: boolean;
}

// Sends a single email using the configured SMTP server. Returns { ok: false }
// when SMTP is not usable (disabled, not configured, or a transient send error).
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const [{ transport, reason }, cfg] = await Promise.all([buildSmtpTransport(), getSmtpConfig()]);
  if (!transport || !cfg) {
    if (reason === "decrypt_failed") {
      return { ok: false, error: "SMTP password is unreadable (ENCRYPTION_KEY mismatch)", decryptFailed: true };
    }
    return { ok: false, error: "SMTP not configured or disabled" };
  }

  try {
    await transport.sendMail({
      from: smtpFromAddress(cfg),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SMTP send failed", message);
    return { ok: false, error: message };
  }
}
