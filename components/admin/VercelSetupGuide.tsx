"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, KeyRound, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { GuideScreenshot } from "./GuideScreenshot";

interface Props {
  // How far setup has progressed. The guide renders for "needs-env" and
  // "db-unreachable"; the parent handles "needs-admin" / "ready".
  state: "needs-env" | "db-unreachable";
  // Required env vars still unset (from lib/vercel-setup.missingEnvVars()).
  missing: string[];
  error?: string | null;
}

// The env vars the project needs, in the order they should be added on Vercel.
// `kind` marks the ones the in-browser generator can fill for you.
const VARS: Array<{ name: string; hint: string; example?: string; kind?: "b64" | "hex" }> = [
  { name: "DATABASE_URL", hint: "Stringa di connessione al database", example: "mysql://user:pass@host:3306/dbname" },
  { name: "DATABASE_PROVIDER", hint: "postgresql · mysql · mariadb · mongodb", example: "mysql" },
  { name: "ENCRYPTION_KEY", hint: "Chiave AES-256 — base64, 32 byte", kind: "b64" },
  { name: "HASH_PEPPER", hint: "Pepper hashing codici — hex, 32 byte", kind: "hex" },
  { name: "ADMIN_SESSION_SECRET", hint: "Firma sessione admin — hex, 32 byte", kind: "hex" },
  { name: "PARTICIPANT_SESSION_SECRET", hint: "Firma sessione partecipante — hex, 32 byte", kind: "hex" },
  { name: "CRON_SECRET", hint: "Segreto cron retention — hex, 32 byte", kind: "hex" },
];

const PROVIDERS = ["postgresql", "mysql", "mariadb", "mongodb"] as const;

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function toHex(a: Uint8Array): string {
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
function toBase64(a: Uint8Array): string {
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s);
}
function generateSecrets(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of VARS) {
    if (v.kind === "b64") out[v.name] = toBase64(randomBytes(32));
    else if (v.kind === "hex") out[v.name] = toHex(randomBytes(32));
  }
  return out;
}

const StepBadge = ({ n }: { n: number }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
    {n}
  </span>
);

export function VercelSetupGuide({ state, missing, error: initialError }: Props) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(initialError ?? null);
  const [testMissing, setTestMissing] = useState<string[]>(state === "needs-env" ? missing : []);
  const [testOk, setTestOk] = useState(false);
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  const [dbUrl, setDbUrl] = useState("");
  const [dbProvider, setDbProvider] = useState<string>("postgresql");

  async function testConnection() {
    setTesting(true);
    setTestError(null);
    setTestMissing([]);
    setTestOk(false);
    try {
      const res = await fetch("/api/admin/setup/vercel-test");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setTestOk(true);
        setTimeout(() => router.refresh(), 1200);
      } else {
        if (Array.isArray(data?.missing) && data.missing.length > 0) setTestMissing(data.missing);
        setTestError(data?.message ?? "Connessione fallita. Verifica le env vars.");
      }
    } catch {
      setTestError("Impossibile contattare il server.");
    } finally {
      setTesting(false);
    }
  }

  // Generate on demand so "Scarica"/"Copia" always produce a complete file.
  function ensureSecrets(): Record<string, string> {
    if (secrets) return secrets;
    const s = generateSecrets();
    setSecrets(s);
    return s;
  }

  // A full .env ready for Vercel's "Import .env" (or paste). Plain KEY="value"
  // lines only — no comments — so any importer parses it cleanly.
  function buildEnvFile(sec: Record<string, string>): string {
    return (
      [
        `DATABASE_URL="${dbUrl.trim() || "REPLACE_WITH_YOUR_DATABASE_URL"}"`,
        `DATABASE_PROVIDER="${dbProvider}"`,
        `ENCRYPTION_KEY="${sec.ENCRYPTION_KEY}"`,
        `HASH_PEPPER="${sec.HASH_PEPPER}"`,
        `ADMIN_SESSION_SECRET="${sec.ADMIN_SESSION_SECRET}"`,
        `PARTICIPANT_SESSION_SECRET="${sec.PARTICIPANT_SESSION_SECRET}"`,
        `CRON_SECRET="${sec.CRON_SECRET}"`,
        `ROUTE_PROVIDER="osrm"`,
      ].join("\n") + "\n"
    );
  }

  function downloadEnv() {
    const content = buildEnvFile(ensureSecrets());
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyEnv() {
    const content = buildEnvFile(ensureSecrets());
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <TriangleAlert size={18} className="shrink-0 text-amber-400" aria-hidden="true" />
        <p className="text-amber-200">
          Sei su <strong>Vercel</strong>. Il database si configura tramite <strong>Environment Variables</strong>, non da questa pagina. Segui i passaggi qui sotto.
        </p>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-background p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Variabili ancora mancanti</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <code key={m} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-amber-300">{m}</code>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 rounded-lg border border-surface-border p-4">
        {/* Step 1 */}
        <div className="flex gap-3">
          <StepBadge n={1} />
          <div className="flex w-full flex-col gap-2">
            <p className="font-medium text-foreground">Apri le Environment Variables</p>
            <p className="text-muted">
              Nel dashboard{" "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                vercel.com <ExternalLink size={12} />
              </a>{" "}
              apri il progetto → <strong>Settings → Environment Variables</strong>.
            </p>
            <GuideScreenshot
              src="/setup/1-environment-variables.png"
              alt="Vercel: Settings → Environment Variables"
              caption="Settings → Environment Variables"
            />
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3">
          <StepBadge n={2} />
          <div className="flex w-full flex-col gap-3">
            <p className="font-medium text-foreground">Compila le variabili</p>
            <p className="text-muted">
              Modo più rapido: <strong>compila e scarica il file .env qui sotto</strong>, poi su Vercel usa <strong>Import .env</strong> (o incolla il contenuto nel campo Key). In alternativa aggiungile una a una con <strong>Add Environment Variable</strong>.
            </p>

            {/* .env builder + generator */}
            <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-background p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <KeyRound size={14} aria-hidden="true" /> Componi il tuo file .env
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted">DATABASE_URL</label>
                <input
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="mysql://user:pass@host:3306/dbname"
                  className="w-full rounded-md border border-surface-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted">DATABASE_PROVIDER</label>
                <select
                  value={dbProvider}
                  onChange={(e) => setDbProvider(e.target.value)}
                  className="w-full rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-[11px] text-foreground focus:border-foreground focus:outline-none"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-surface-border pt-2">
                <p className="text-[11px] text-muted">Segreti generati nel browser (nulla viene inviato).</p>
                <button
                  type="button"
                  onClick={() => setSecrets(generateSecrets())}
                  className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
                >
                  <RefreshCw size={12} aria-hidden="true" />
                  {secrets ? "Rigenera segreti" : "Genera segreti"}
                </button>
              </div>

              {secrets && (
                <div className="flex flex-col gap-1.5">
                  {VARS.filter((v) => secrets[v.name]).map((v) => (
                    <div key={v.name} className="flex items-center gap-2">
                      <code className="w-52 shrink-0 text-[11px] text-muted">{v.name}</code>
                      <code className="flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-[11px] text-foreground">{secrets[v.name]}</code>
                      <CopyButton value={secrets[v.name]} />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-amber-300/90">
                <strong>ENCRYPTION_KEY</strong> e <strong>HASH_PEPPER</strong> vanno mantenuti stabili: cambiarli rende illeggibili i dati già salvati.
              </p>

              <div className="flex flex-wrap items-center gap-2 border-t border-surface-border pt-2">
                <button
                  type="button"
                  onClick={downloadEnv}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                >
                  <Download size={13} aria-hidden="true" />
                  Scarica .env
                </button>
                <button
                  type="button"
                  onClick={copyEnv}
                  className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  Copia contenuto .env
                </button>
                {!dbUrl.trim() && (
                  <span className="text-[11px] text-amber-300/80">Compila DATABASE_URL per un file completo.</span>
                )}
              </div>
            </div>

            <details className="rounded-lg border border-surface-border">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted hover:text-foreground">Elenco completo delle variabili</summary>
              <div className="overflow-x-auto border-t border-surface-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-muted">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Descrizione</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {VARS.map((v) => (
                      <tr key={v.name} className="border-b border-surface-border/60 last:border-0">
                        <td className="px-3 py-2 align-top">
                          <code className="text-[11px] text-foreground">{v.name}</code>
                        </td>
                        <td className="px-3 py-2 align-top text-muted">
                          {v.hint}
                          {v.example && <div className="mt-0.5 font-mono text-[10px] text-muted/70">es. {v.example}</div>}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <CopyButton value={v.name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <GuideScreenshot
              src="/setup/2-add-variable.png"
              alt="Vercel: form Add Environment Variable / Import .env"
              caption="Import .env oppure Add Environment Variable → nome, valore, ambienti → Save"
            />
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3">
          <StepBadge n={3} />
          <div className="flex w-full flex-col gap-2">
            <p className="font-medium text-foreground">Rideploya il progetto</p>
            <p className="text-muted">
              Le env vars si applicano solo a un nuovo deploy: <strong>Deployments</strong> → ultimo deploy → menu <strong>⋯</strong> → <strong>Redeploy</strong>.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3">
          <StepBadge n={4} />
          <div className="flex w-full flex-col gap-1">
            <p className="font-medium text-foreground">Verifica e crea l&apos;amministratore</p>
            <p className="text-muted">
              Dopo il redeploy, torna qui e verifica: se tutto è a posto potrai creare l&apos;account admin.
            </p>
          </div>
        </div>
      </div>

      {testMissing.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="flex flex-col gap-1 text-amber-200">
            <p className="font-medium">Variabili mancanti</p>
            <div className="flex flex-wrap gap-1.5">
              {testMissing.map((m) => (
                <code key={m} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-amber-300">{m}</code>
              ))}
            </div>
            <p className="text-xs text-amber-300/80">Aggiungile su Vercel e rideploya, poi riprova.</p>
          </div>
        </div>
      )}

      {testError && testMissing.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
          <div className="flex flex-col gap-1 text-red-200">
            <p className="font-medium">Connessione fallita</p>
            <p className="break-words">{testError}</p>
            <p className="text-xs text-red-300">Assicurati che il database sia accessibile da internet e che le env vars siano corrette.</p>
          </div>
        </div>
      )}

      {testOk && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <CheckCircle2 size={18} className="shrink-0 text-green-400" aria-hidden="true" />
          <p className="text-green-200">Tutto pronto! Reindirizzamento alla creazione dell&apos;account...</p>
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={testing}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-50"
      >
        {testing ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Verifica in corso...
          </>
        ) : (
          <>
            <CheckCircle2 size={16} aria-hidden="true" />
            Verifica connessione
          </>
        )}
      </button>
    </div>
  );
}
