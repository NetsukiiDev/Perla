"use client";

import { useT } from "@/lib/i18n/context";

const ERROR_MESSAGES: Record<string, (t: ReturnType<typeof useT>) => string> = {
  invalid: (t) => t.login.errors.invalid,
  rate_limited: (t) => t.login.errors.rateLimit,
};

export function LoginForm({ nextPath, error }: { nextPath: string; error?: string }) {
  const t = useT();
  const message = error ? ERROR_MESSAGES[error]?.(t) : null;

  return (
    <form action="/api/admin/auth/login" method="post" className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-email" className="text-xs uppercase tracking-wide text-muted">
          {t.login.email}
        </label>
        <input
          id="admin-email"
          type="email"
          name="email"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className="text-xs uppercase tracking-wide text-muted">
          {t.login.password}
        </label>
        <input
          id="admin-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      {message && <p className="text-sm text-danger">{message}</p>}
      <button type="submit" className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground">
        {t.login.loginButton}
      </button>
      <a
        href="/admin/forgot-password"
        className="self-end text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        {t.login.forgotPasswordLink}
      </a>
    </form>
  );
}
