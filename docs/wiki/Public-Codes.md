# Public Codes

Oltre ai codici **monouso** (uno per partecipante, legati al dispositivo), PERLA supporta i **codici pubblici**: un unico codice riusabile da **più persone**, **senza scadenza**, con un **tetto massimo** di utilizzi.

## Come funziona

- Ogni persona/dispositivo che usa il codice pubblico diventa un partecipante **"Ospite"** separato, tracciato singolarmente nella dashboard live.
- Il codice **non si consuma**: resta valido finché non lo revochi o raggiungi il tetto massimo.
- Ogni dispositivo resta legato alla propria sessione (una persona non può passare la caccia a metà a un altro dispositivo).

## Crearne uno

Dalla pagina **Partecipanti** di un evento → riquadro **"Codici pubblici"**:

1. Imposta gli **Utilizzi massimi** (es. `100`).
2. Clicca **Crea codice pubblico**.
3. Condividi il codice o il link/QR.

La tabella mostra per ogni codice: **utilizzi (usati / max)**, stato (*Attivo · senza scadenza* / *Revocato*), e le azioni **revoca** ed **elimina**.

## Sotto il cofano

| Elemento | Dettaglio |
|---|---|
| Schema | `InviteCode.isPublic = true`, `participantId = null`, `maxSessions` = tetto |
| Endpoint | `POST /api/admin/codes/public` |
| Avvio sessione | `app/api/session/start` crea un partecipante "Ospite" per dispositivo, senza consumare il codice |
| Risoluzione | `lib/code-resolution.ts` risolve **per dispositivo**: mai "già usato" per gli altri, cap applicato ai nuovi |

## Note

- I partecipanti "Ospite" compaiono nella lista partecipanti e nella dashboard live come righe separate.
- Revocare il codice blocca i **nuovi** accessi; le sessioni già avviate restano.
