# Architecture

## Sistema

```mermaid
flowchart TB
  P["Partecipante<br/>(browser mobile)"]
  A["Organizzatore<br/>(dashboard admin)"]

  subgraph app ["PERLA - Next.js (App Router)"]
    direction TB
    PF["Flusso partecipante /c"]
    PROJ["public-projection<br/>(unico punto pubblico)"]
    GUARD["admin-guard"]
    API["API routes"]
  end

  DB[("Database cifrato")]
  ROUTE["Route provider<br/>OSRM / ORS / Google"]

  P -->|"codice"| PF --> PROJ
  PROJ -.->|"solo tappa corrente"| P
  A --> GUARD --> API --> DB
  PROJ --> DB
  API -->|"calcola percorso"| ROUTE
```

## Flusso partecipante

```mermaid
sequenceDiagram
  actor U as Partecipante
  participant W as PERLA
  participant DB as DB cifrato
  U->>W: Inserisce il codice
  W->>DB: Verifica hash (SHA-256 + pepper)
  W-->>U: Consenso geolocalizzazione
  U->>W: Posizione GPS
  W->>W: Percorso -> N tappe (cifrate)
  W->>DB: Crea sessione + tappe
  W-->>U: Tappa 1 di N
  loop Per ogni tappa
    U->>W: Raggiunge il punto
    W-->>U: Sblocca la successiva
  end
  W-->>U: Percorso completato
```

## Componenti chiave

| Modulo | Responsabilità |
|---|---|
| `lib/public-projection.ts` | **Unico** punto che decide cosa vede il partecipante; decritta solo la tappa corrente |
| `lib/code-resolution.ts` | Risoluzione codice → stato (monouso vs pubblico, per-dispositivo) |
| `lib/crypto.ts` | AES-256-GCM per le coordinate |
| `lib/hash.ts` | SHA-256 + pepper per il lookup dei codici |
| `lib/admin-guard.ts` | Protezione delle route/pagine admin |
| `lib/route-provider/` | Astrazione dei provider di routing |
| `lib/i18n/` | Dizionari IT/EN + provider lingua |
| `proxy.ts` | Enforce HTTPS in prod + gate delle route `/admin/*` |

## Invarianti di sicurezza

Vedi la pagina dedicata: **[Security](Security)**. In sintesi: un solo punto di proiezione pubblica, nessun dato identificativo verso il partecipante, coordinate cifrate at-rest, codici hashati, cookie `httpOnly`, l'IP non è mai un blocco rigido.
