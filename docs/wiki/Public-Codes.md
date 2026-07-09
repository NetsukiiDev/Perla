# Public Codes

Besides **one-time** codes (one per participant, device-bound), PERLA supports **public codes**: a single code reusable by **many people**, with **no expiry** and a **maximum usage cap**.

## How it works

- Each person/device that uses the public code becomes a separate **"Guest"** participant, tracked individually on the live dashboard.
- The code is **never consumed**: it stays valid until you revoke it or the usage cap is reached.
- Each device stays bound to its own session (a person can't hand off a half-finished hunt to another device).

## Create one

From an event's **Participants** page → **"Public codes"** panel:

1. Set the **maximum uses** (e.g. `100`).
2. Click **Create public code**.
3. Share the code, link or QR.

The table shows, per code: **uses (used / max)**, status (*Active · no expiry* / *Revoked*), and the **revoke** and **delete** actions.

## Under the hood

| Item | Detail |
|---|---|
| Schema | `InviteCode.isPublic = true`, `participantId = null`, `maxSessions` = cap |
| Endpoint | `POST /api/admin/codes/public` |
| Session start | `app/api/session/start` creates a "Guest" participant per device, without consuming the code |
| Resolution | `lib/code-resolution.ts` resolves **per device**: never "already used" for others, cap enforced for new devices |

## Notes

- "Guest" participants appear in the participants list and live dashboard as separate rows.
- Revoking a code blocks **new** entries; sessions already started remain.
