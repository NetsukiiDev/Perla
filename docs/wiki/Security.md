# Security

PERLA's security model rests on a few **invariants** that must be preserved in every change.

1. **Single public projection point.** `lib/public-projection.ts` is the only module allowed to decide what the participant sees. It decrypts coordinates **for the current stop only**. Any new public route/page must go through it.
2. **No technical/identifying data to the participant.** Event name, participant name, plaintext code, logs and the full stop list are never serialized to the public client.
3. **Hashed codes + admin-only encryption.** `lib/hash.ts` stores SHA-256 + pepper for lookup; `lib/crypto.ts` also stores an AES-GCM copy recoverable only by authenticated admin APIs.
4. **Coordinates encrypted at rest.** `lib/crypto.ts` encrypts `destination_*`, `route_steps.*_encrypted`, `location_updates.*_encrypted`.
5. **Cookies.** `httpOnly`, `secure` in production, `sameSite` strict/lax. The device token is an `httpOnly` cookie (not `localStorage`).
6. **IP is never a hard block.** It is only hashed as audit data; the "one code, one device" constraint relies on the **device token**.
7. **No promise of absolute anonymity.** Minimal logs (`access_logs`) remain for audit; automatic retention removes temporary position data, not every technical trace.

## Secrets

Keep `ENCRYPTION_KEY` and `HASH_PEPPER` **stable**: changing them makes already-encrypted/hashed data unreadable. See [Configuration](Configuration) for generation.

## Retention

`/api/cron/retention` (protected by `Authorization: Bearer <CRON_SECRET>`) deletes expired positions, positions from closed/archived events, and sessions still active after event closure. `vercel.json` schedules it once daily.
