# Getting Started

## Requirements

- **Node.js** 20+
- A database: **PostgreSQL**, **MySQL**, **MariaDB** or **MongoDB**

## Install

```bash
git clone https://github.com/NetsukiiDev/Perla.git
cd Perla
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open **http://localhost:3000**.

## First run — setup wizard

Until the site **is configured**, every page redirects to **`/admin/setup`**, a two-step wizard:

1. **Database** — pick a provider and enter connection details (manual fields or a connection string). The system tests the connection, creates the schema (`prisma db push`) and saves the config to `.data/config.json`.
2. **Administrator** — create the first admin account and get signed in automatically.

Once complete, the homepage goes back to showing only the code input field.

> On **Vercel** (read-only filesystem) the wizard is replaced by an in-app guide — see [Deploy on Vercel](Deploy-on-Vercel).

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate the Prisma client for the active provider |
| `npm run db:push` | Apply the schema to the database |
| `npm run db:seed` | Create the first admin (deploy without the wizard) |
| `npm run lint` | ESLint |

## Next steps

- [Configuration](Configuration) — all environment variables
- [Architecture](Architecture) — how it works internally
- Create your first event from **/admin/events**
