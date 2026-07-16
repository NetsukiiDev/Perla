# Internationalization (i18n)

PERLA supports **Italian, English, Spanish, French, German, Portuguese, Dutch and Polish**. The language is chosen from **Settings** (`/admin/settings`) and applies to both the admin area and the participant flow.

## How it works

| Piece | File |
|---|---|
| Config (locales, cookie) | `lib/i18n/config.ts` |
| Dictionaries | `lib/i18n/{it,en,es,fr,de,pt,nl,pl}.ts` |
| `Dictionary` type | `lib/i18n/types.ts` |
| Server loader | `lib/i18n/server.ts` (`getLocale`, `getDictionary`) |
| Client provider | `lib/i18n/context.tsx` (`I18nProvider`, `useT`, `useLocale`) |
| Endpoint | `POST /api/settings/locale` (sets the `locale` cookie) |

- The language is persisted in the **`locale`** cookie (`it` | `en` | `es` | `fr` | `de` | `pt` | `nl` | `pl`, default `it`).
- The **root layout** reads the cookie, sets `<html lang>`, and wraps the app in `I18nProvider` (covers admin **and** the participant flow).
- **Client components** use `useT()`; **server routes/pages** use `getDictionary(await getLocale())`.

## Add / edit strings

1. Add the key to the Italian dictionary `lib/i18n/it.ts`.
2. Update the `Dictionary` type in `lib/i18n/types.ts`.
3. Add the matching translation in `lib/i18n/en.ts`.

The `Dictionary` type guarantees at compile time that **every locale has every key** — if one is missing, `tsc` fails.

## Interpolation

Placeholders like `{version}`, `{count}`, `{time}` are replaced via `String.replace("{key}", value)`. Make sure the placeholder exists in **both** languages.

## Add a new language

1. Add the code to `LOCALES` in `lib/i18n/config.ts`.
2. Create `lib/i18n/<locale>.ts` satisfying the `Dictionary` type.
3. Register it in the loader `lib/i18n/index.ts`.
