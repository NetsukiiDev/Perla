# Versioning & Updates

La pagina **Impostazioni** (`/admin/settings`) mostra la **versione corrente**, controlla se sono disponibili **aggiornamenti** e riporta alcune **info di build**.

## Fonte della versione

- La versione è **una sola**: il campo `version` di `package.json` (esposto da `lib/version.ts`).
- Il `CHANGELOG.md` documenta le modifiche seguendo [SemVer](https://semver.org/lang/it/).

## Controllo aggiornamenti

L'endpoint `GET /api/admin/version` (solo admin):

1. Legge la versione locale.
2. Interroga l'**API GitHub** per l'ultima *release* (fallback: ultimo *tag*) del repo `NetsukiiDev/Perla`.
3. Confronta con SemVer e restituisce `updateAvailable`.

Risposta tipica:

```json
{
  "name": "PERLA",
  "version": "0.1.0",
  "latest": "0.1.0",
  "updateAvailable": false,
  "checkFailed": false,
  "commit": "…",
  "env": "vercel"
}
```

Per far comparire "aggiornamento disponibile", pubblica una nuova **release/tag** su GitHub (es. `v0.2.0`) con versione superiore a quella in `package.json`.

## Info build

- **Ambiente**: `vercel` in produzione su Vercel, altrimenti `NODE_ENV`.
- **Commit**: da `VERCEL_GIT_COMMIT_SHA` (iniettato da Vercel) quando disponibile.

## Nota

Se il controllo mostra *"Impossibile verificare"* in locale, è tipicamente una **VPN/antivirus che intercetta il TLS** e impedisce la verifica del certificato GitHub. Non è un bug: su Vercel (senza intercettazione TLS) funziona regolarmente. Il degrado è gestito con grazia.
