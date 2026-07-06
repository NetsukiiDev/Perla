const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Credenziali non valide.",
  rate_limited: "Troppi tentativi. Riprova tra qualche minuto.",
};

export function LoginForm({ nextPath, error }: { nextPath: string; error?: string }) {
  const message = error ? ERROR_MESSAGES[error] : null;

  return (
    <form action="/api/admin/auth/login" method="post" className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-email" className="text-xs uppercase tracking-wide text-muted">
          Email
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
          Password
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
        Accedi
      </button>
    </form>
  );
}
