# Security

Il modello di sicurezza di PERLA si regge su alcune **invarianti** che vanno preservate in ogni modifica.

1. **Un solo punto di proiezione pubblica.** `lib/public-projection.ts` è l'unico modulo autorizzato a decidere cosa vede il partecipante. Decritta le coordinate **solo per la tappa corrente**. Ogni nuova route/pagina pubblica deve passare da qui.
2. **Nessun dato tecnico/identificativo al partecipante.** Nome evento, nome partecipante, codice in chiaro, log e l'elenco completo delle tappe non vengono mai serializzati verso il client pubblico.
3. **Codici hash + cifratura admin.** `lib/hash.ts` salva SHA-256 + pepper per il lookup; `lib/crypto.ts` salva anche una copia AES-GCM recuperabile solo dalle API admin autenticate.
4. **Coordinate cifrate at-rest.** `lib/crypto.ts` cifra `destination_*`, `route_steps.*_encrypted`, `location_updates.*_encrypted`.
5. **Cookie.** `httpOnly`, `secure` in produzione, `sameSite` strict/lax. Il device token è un cookie `httpOnly` (non `localStorage`).
6. **L'IP non è mai un blocco rigido.** Viene solo hashato come dato di audit; il vincolo "un codice, un dispositivo" si basa sul **device token**.
7. **Niente promesse di anonimato assoluto.** Log minimi (`access_logs`) restano per audit; la retention automatica elimina i dati di posizione temporanei, non ogni traccia tecnica.

## Segreti

`ENCRYPTION_KEY` e `HASH_PEPPER` vanno **mantenuti stabili**: cambiarli rende illeggibili i dati già cifrati/hashati. Vedi [Configuration](Configuration) per la generazione.

## Retention

`/api/cron/retention` (protetto da `Authorization: Bearer <CRON_SECRET>`) elimina posizioni scadute, posizioni di eventi chiusi/archiviati e sessioni attive dopo la chiusura dell'evento. `vercel.json` la programma una volta al giorno.
