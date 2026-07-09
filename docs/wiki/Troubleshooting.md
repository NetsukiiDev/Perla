# Troubleshooting

## Deploy / Database

| Sintomo | Causa | Soluzione |
|---|---|---|
| `ECONNRESET` / "Connessione fallita" | DB non raggiungibile da Vercel | Apri il firewall (IP Vercel) o usa un DB cloud |
| `ENOENT: schema.prisma` | File tracing mancante | Usa l'ultima `next.config.ts` (già configurata) |
| `DATABASE_URL not set` | `SETUP_DISABLED=true` ma `DATABASE_URL` mancante | Imposta la variabile su Vercel |
| `prisma generate` fallisce | Provider non corrispondente | Controlla `DATABASE_PROVIDER` |

## Login / Setup

| Sintomo | Causa | Soluzione |
|---|---|---|
| Errore `ADMIN_SESSION_SECRET is not set` al login | Segreti mancanti nel `.env` | Genera e aggiungi i 5 segreti (vedi [Configuration](Configuration)) |
| Il sito reindirizza sempre a `/admin/setup` | Setup non completato | Completa il wizard, o su Vercel imposta le env + `SETUP_DISABLED=true` |
| "Questo codice è già stato utilizzato" | Codice monouso già consumato da un altro dispositivo | Rigenera il codice, oppure usa un [codice pubblico](Public-Codes) |

## Impostazioni / Aggiornamenti

| Sintomo | Causa | Soluzione |
|---|---|---|
| "Impossibile verificare gli aggiornamenti" in locale | VPN/antivirus che intercetta il TLS (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) | Non è un bug: funziona su Vercel. Disattiva l'intercettazione TLS se vuoi testarlo in locale |
| La lingua non cambia | Cookie `locale` non impostato | Cambia lingua da **Impostazioni**; verifica che i cookie non siano bloccati |

## Routing / Percorso

| Sintomo | Causa | Soluzione |
|---|---|---|
| "Nessun percorso trovato" | Coordinate non stradabili o OSRM irraggiungibile | Verifica le coordinate; imposta un `OSRM_BASE_URL` self-hosted |
| Pedaggio non mostrato | Provider ≠ OSRM, o toggle disattivato | Usa OSRM e abilita "Mostra autostrada e pedaggio" nell'evento |

Se il problema persiste, apri una [issue](https://github.com/NetsukiiDev/Perla/issues).
