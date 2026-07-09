# Getting Started

## Requisiti

- **Node.js** 20+
- Un database: **PostgreSQL**, **MySQL**, **MariaDB** o **MongoDB**

## Installazione

```bash
git clone https://github.com/NetsukiiDev/Perla.git
cd Perla
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Apri **http://localhost:3000**.

## Primo avvio — wizard di setup

Finché il sito **non è configurato**, ogni pagina reindirizza a **`/admin/setup`**, un wizard in due passi:

1. **Database** — scegli il provider e inserisci i dati di connessione (manuale o stringa). Il sistema testa la connessione, crea lo schema (`prisma db push`) e salva la configurazione in `.data/config.json`.
2. **Amministratore** — crea il primo account admin e vieni autenticato automaticamente.

Completato il setup, la homepage torna a mostrare solo il campo codice.

> Su **Vercel** (filesystem read-only) il wizard è sostituito da una guida integrata: vedi [Deploy on Vercel](Deploy-on-Vercel).

## Comandi utili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run db:generate` | Genera il client Prisma per il provider attivo |
| `npm run db:push` | Applica lo schema al database |
| `npm run db:seed` | Crea il primo admin (deploy senza wizard) |
| `npm run lint` | ESLint |

## Prossimi passi

- [Configuration](Configuration) — tutte le variabili d'ambiente
- [Architecture](Architecture) — come funziona internamente
- Crea il tuo primo evento da **/admin/events**
