"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, TriangleAlert } from "lucide-react";

interface Props {
  dbConfigured: boolean;
  error: string | null;
}

export function VercelSetupGuide({ dbConfigured, error: initialError }: Props) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(initialError);
  const [testOk, setTestOk] = useState(false);

  async function testConnection() {
    setTesting(true);
    setTestError(null);
    setTestOk(false);
    try {
      const res = await fetch("/api/admin/setup/vercel-test");
      if (res.ok) {
        setTestOk(true);
        setTimeout(() => router.refresh(), 1200);
      } else {
        const data = await res.json().catch(() => null);
        setTestError(data?.message ?? "Connessione fallita. Verifica le env vars.");
      }
    } catch {
      setTestError("Impossibile contattare il server.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <TriangleAlert size={18} className="shrink-0 text-amber-400" />
        <p className="text-amber-200">
          Sei su <strong>Vercel</strong>. La configurazione del database avviene tramite environment variables.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-surface-border p-4 text-muted">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">Passaggi</h2>

        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">1</span>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Apri il dashboard Vercel</p>
            <p>
              Vai su{" "}
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                vercel.com <ExternalLink size={12} />
              </a>{" "}
              → progetto → <strong>Settings → Environment Variables</strong>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">2</span>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Imposta le variabili obbligatorie</p>
            <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-xs leading-relaxed">
{`DATABASE_URL          postgresql://...
DATABASE_PROVIDER     postgresql
ENCRYPTION_KEY        <base64 32 byte>
HASH_PEPPER           <hex 32 byte>
ADMIN_SESSION_SECRET  <hex 32 byte>
PARTICIPANT_SESSION_SECRET <hex 32 byte>
CRON_SECRET           <hex 32 byte>
ROUTE_PROVIDER        osrm`}
            </pre>
            <p className="text-xs text-muted">
              Genera le chiavi con: <code className="rounded bg-background px-1">openssl rand -base64 32</code> e <code className="rounded bg-background px-1">openssl rand -hex 32</code>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">3</span>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Prepara il database</p>
            <p>
              Le tabelle vanno create manualmente. Dalla tua macchina, esegui:
            </p>
            <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-xs leading-relaxed">
{`npx prisma db push --url "<DATABASE_URL>"`}
            </pre>
            <p className="text-xs text-muted">
              Sostituisci con la stessa connection string che hai inserito in Vercel.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">4</span>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Rideploya</p>
            <p>
              Dopo aver impostato le env vars, fai un nuovo deploy da Git oppure clicca <strong>Redeploy</strong> in Vercel.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">5</span>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Verifica la connessione</p>
            <p>
              Dopo il redeploy, torna qui e clicca il pulsante qui sotto per verificare.
            </p>
          </div>
        </div>
      </div>

      {testError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <TriangleAlert size={18} className="shrink-0 mt-0.5 text-red-400" />
          <div className="flex flex-col gap-1 text-sm text-red-200">
            <p className="font-medium">Connessione fallita</p>
            <p>{testError}</p>
            <p className="text-xs text-red-300">
              Assicurati che il database sia accessibile da internet e che le env vars siano corrette.
            </p>
          </div>
        </div>
      )}

      {testOk && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <CheckCircle2 size={18} className="shrink-0 text-green-400" />
          <p className="text-green-200">Connessione riuscita! Reindirizzamento...</p>
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={testing}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-50"
      >
        {testing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Verifica in corso...
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            Verifica connessione database
          </>
        )}
      </button>
    </div>
  );
}
