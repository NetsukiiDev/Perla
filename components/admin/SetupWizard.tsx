"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Database, UserPlus, TriangleAlert } from "lucide-react";

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
  const [step, setStep] = useState<Step>(initialStep);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-muted">
        <span className={step === "database" ? "text-foreground" : ""}>1. Database</span>
        <span>&#8250;</span>
        <span className={step === "admin" ? "text-foreground" : ""}>2. Amministratore</span>
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
          setRestartMsg(
            `Database inizializzato. Riavvia il server con "npm run dev", poi ricarica questa pagina per creare l'account.`,
          );
          return;
        }
        onDone();
        return;
      }
      setError(data?.message ?? data?.error ?? "Impossibile configurare il database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Si è verificato un errore. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Provider</label>
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
            Assicurati che il server MongoDB sia in esecuzione. Il database verrà creato automaticamente se non esiste.
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
            {m === "manual" ? "Manuale" : "Stringa"}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Stringa di connessione</label>
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
              <label className={labelClass}>Host</label>
              <input
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Porta</label>
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
            <label className={labelClass}>Database</label>
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
              <label className={labelClass}>Utente</label>
              <input required value={user} onChange={(e) => setUser(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Password</label>
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
            Inizializzazione...
          </>
        ) : (
          <>
            <Database size={16} aria-hidden="true" />
            Verifica e inizializza
          </>
        )}
      </button>
    </form>
  );
}

function AdminStep({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
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
      setError(data?.message ?? data?.error ?? "Impossibile completare la configurazione. Controlla i dati.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Si è verificato un errore. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Password</label>
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
        <label className={labelClass}>Conferma password</label>
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
            Creazione...
          </>
        ) : (
          <>
            <UserPlus size={16} aria-hidden="true" />
            Crea account amministratore
          </>
        )}
      </button>
    </form>
  );
}
