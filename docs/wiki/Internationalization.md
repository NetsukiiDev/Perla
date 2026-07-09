# Internationalization (i18n)

PERLA è **bilingue Italiano / English**. La lingua si sceglie da **Impostazioni** (`/admin/settings`) e vale sia per l'area admin sia per il flusso partecipante.

## Come funziona

| Pezzo | File |
|---|---|
| Config (locale, cookie) | `lib/i18n/config.ts` |
| Dizionari | `lib/i18n/it.ts`, `lib/i18n/en.ts` |
| Tipo `Dictionary` | `lib/i18n/types.ts` |
| Loader server | `lib/i18n/server.ts` (`getLocale`, `getDictionary`) |
| Provider client | `lib/i18n/context.tsx` (`I18nProvider`, `useT`, `useLocale`) |
| Endpoint | `POST /api/settings/locale` (imposta il cookie `locale`) |

- La lingua è persistita nel cookie **`locale`** (`it` | `en`, default `it`).
- Il **root layout** legge il cookie, imposta `<html lang>` e avvolge l'app in `I18nProvider` (copre admin **e** flusso partecipante).
- I **componenti client** usano `useT()`; le **route/pagine server** usano `getDictionary(await getLocale())`.

## Aggiungere/modificare stringhe

1. Aggiungi la chiave nel dizionario italiano `lib/i18n/it.ts`.
2. Aggiorna il tipo `Dictionary` in `lib/i18n/types.ts`.
3. Aggiungi la traduzione corrispondente in `lib/i18n/en.ts`.

Il tipo `Dictionary` garantisce a compile-time che **ogni lingua abbia tutte le chiavi**: se ne manca una, `tsc` fallisce.

## Interpolazione

Segnaposto come `{version}`, `{count}`, `{time}` vengono sostituiti con `String.replace("{chiave}", valore)`. Assicurati che il segnaposto sia presente in **entrambe** le lingue.

## Aggiungere una nuova lingua

1. Aggiungi il codice a `LOCALES` in `lib/i18n/config.ts`.
2. Crea `lib/i18n/<locale>.ts` che soddisfa il tipo `Dictionary`.
3. Registralo nel loader `lib/i18n/index.ts`.
