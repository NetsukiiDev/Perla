"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Database, UserPlus, TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type Step = "database" | "admin";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none disabled:opacity-50";
const labelClass = "text-xs uppercase tracking-wide text-muted";

const PROVIDERS = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "mongodb", label: "MongoDB" },
] as const;

const PLACEHOLDERS: Record<string, string> = {
  postgresql: "postgresql://user:password@localhost:5432/perla",
  mysql: "mysql://user:password@localhost:3306/perla",
  mariadb: "mysql://user:password@localhost:3306/perla",
  mongodb: "mongodb://user:password@localhost:27017/perla",
};

export function SetupWizard({ initialStep, currentProvider }: { initialStep: Step; currentProvider: string }) {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<Step>(initialStep);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-muted">
        <span className={step === "database" ? "text-foreground" : ""}>{t.setup.wizard.step1}</span>
        <span>&#8250;</span>
        <span className={step === "admin" ? "text-foreground" : ""}>{t.setup.wizard.step2}</span>
      </div>

      {step === "database" ? (
        <DatabaseStep currentProvider={currentProvider} onDone={() => setStep("admin")} />
      ) : (
        <AdminStep onDone={() => { router.push("/admin/events"); router.refresh(); }} />
      )}
    </div>
  );
}

type DbMode = "manual" | "url";

function DatabaseStep({ currentProvider, onDone }: { currentProvider: string; onDone: () => void }) {
  const t = useT();
  const [provider, setProvider] = useState(
    PROVIDERS.some((p) => p.value === currentProvider) ? currentProvider : "postgresql",
  );
  const [mode, setMode] = useState<DbMode>("manual");
  const [url, setUrl] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultPort = provider === "postgresql" ? "5432" : provider === "mongodb" ? "27017" : "3306";
  const isMongo = provider === "mongodb";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setRestartMsg(null);

    const payload =
      mode === "url"
        ? { provider, url }
        : {
            provider,
            host,
            port: port ? Number(port) : undefined,
            user,
            password: password || undefined,
            database,
          };

    try {
      const res = await fetch("/api/admin/setup/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        if (data.restartRequired) {
          setRestartMsg(t.setup.wizard.db.success);
          return;
        }
        onDone();
        return;
      }
      setError(data?.message ?? data?.error ?? t.setup.wizard.db.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.setup.wizard.admin.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.setup.wizard.db.provider}</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass}>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {isMongo && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            {t.setup.wizard.db.mongoInfo}
          </span>
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-surface-border p-1 text-sm">
        {(["manual", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 ${
              mode === m ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {m === "manual" ? t.setup.wizard.db.manual : t.setup.wizard.db.connectionString}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.setup.wizard.db.connectionString}</label>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={PLACEHOLDERS[provider]}
            className={`${inputClass} font-mono text-sm`}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelClass}>{t.setup.wizard.db.host}</label>
              <input
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>{t.setup.wizard.db.port}</label>
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                inputMode="numeric"
                placeholder={defaultPort}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{t.setup.wizard.db.database}</label>
            <input
              required
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="perla"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>{t.setup.wizard.db.user}</label>
              <input required value={user} onChange={(e) => setUser(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>{t.setup.wizard.db.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {restartMsg && <p className="text-sm text-amber-400">{restartMsg}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t.setup.wizard.db.initLoading}
          </>
        ) : (
          <>
            <Database size={16} aria-hidden="true" />
            {t.setup.wizard.db.initButton}
          </>
        )}
      </button>
    </form>
  );
}

function AdminStep({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t.setup.wizard.admin.errors.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.setup.wizard.admin.errors.notMatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        onDone();
        return;
      }
      setError(data?.message ?? data?.error ?? t.setup.wizard.admin.errors.setupFailed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.setup.wizard.admin.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.setup.wizard.admin.email}</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.setup.wizard.admin.password}</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t.setup.wizard.admin.confirmPassword}</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t.setup.wizard.admin.creating}
          </>
        ) : (
          <>
            <UserPlus size={16} aria-hidden="true" />
            {t.setup.wizard.admin.createButton}
          </>
        )}
      </button>
    </form>
  );
}
