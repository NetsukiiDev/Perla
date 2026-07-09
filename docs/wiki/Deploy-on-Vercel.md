# Deploy on Vercel

Il progetto è **pronto per Vercel** (`vercel.json` + script `vercel-build`). Il wizard di setup **non** funziona su Vercel (filesystem read-only): la configurazione avviene via **Environment Variables**, con una **guida integrata** in `/admin/setup`.

## 1. Collega il repository

1. [vercel.com](https://vercel.com) → **Add New Project** → importa `NetsukiiDev/Perla` (o il tuo fork).
2. Framework auto-rilevato → **Next.js**. Nessun override della build necessario.

## 2. Environment Variables

Imposta almeno queste (vedi [Configuration](Configuration) per i dettagli):

| Variabile | Valore |
|---|---|
| `SETUP_DISABLED` | `true` |
| `DATABASE_PROVIDER` | `postgresql` \| `mysql` \| `mariadb` |
| `DATABASE_URL` | connection string |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `HASH_PEPPER` | `openssl rand -hex 32` |
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 32` |
| `PARTICIPANT_SESSION_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `ROUTE_PROVIDER` | `osrm` |

> 💡 La guida in `/admin/setup` include un **generatore/esportatore `.env`**: puoi scaricare o copiare un file pronto e usare **Import .env** su Vercel.

## 3. Prepara il database

Dalla tua macchina, puntando al DB di produzione:

```bash
export DATABASE_PROVIDER=postgresql
export DATABASE_URL=postgresql://...
npm run db:generate
npx prisma db push
npx tsx prisma/seed.ts   # crea il primo admin
```

> ⚠️ **MariaDB/MySQL**: il DB deve accettare connessioni TCP remote. Aggiungi gli [IP range di Vercel](https://vercel.com/docs/security/firewall#ip-range) al firewall, oppure usa un DB cloud.

## 4. Deploy e verifica

1. **Production Branch**: `master` → **Deploy**.
2. Apri `https://<progetto>.vercel.app/admin/setup` → **Verifica connessione** → crea l'admin.

Il build esegue: `prisma-provider.mjs` → `prisma generate` → `next build`.

## Problemi comuni

Vedi [Troubleshooting](Troubleshooting).
