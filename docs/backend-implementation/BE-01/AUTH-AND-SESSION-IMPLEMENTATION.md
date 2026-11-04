# Auth and Session Implementation

## Operations

| Method | Route | Behavior |
|---|---|---|
| POST | `/api/v1/auth/register` | Zod strict input; normalize email; Argon2id; creates ACTIVE STUDENT; safe profile; no session |
| POST | `/api/v1/auth/login` | Generic invalid-credential response; checks blocked state; creates signed access token and refresh cookie |
| POST | `/api/v1/auth/refresh` | Validates Origin and custom CSRF header; validates and atomically rotates the refresh token |
| POST | `/api/v1/auth/logout` | Validates Origin, CSRF header, and signed bearer token; revokes its session; clears cookie; repeat-safe while the access token is valid |
| POST | `/api/v1/auth/password/forgot` | Generic response; stores only a token hash; uses injected fake or SMTP mail service |
| POST | `/api/v1/auth/password/reset` | Atomically consumes an unexpired one-time token, updates password hash, and revokes active sessions |
| GET | `/api/v1/auth/me` | Validates JWT and current MongoDB user/session state on each call |

## Registration and credentials

Registration accepts only `fullName`, `email`, and `password`. Inputs containing `role`, `status`, or any unknown key fail validation. The server sets `role=STUDENT`; registration neither logs in the user nor creates a course entitlement. This behavior is marked **PROPOSED** in [OPENAPI-CONTRACT-CHANGES.md](OPENAPI-CONTRACT-CHANGES.md).

Email is trimmed and lowercased before a unique-indexed insert. Password hashes use Argon2id with explicit parameters (19,456 KiB memory, time cost 2, parallelism 1); a successful login rehashes when the encoded hash needs an upgrade. `passwordHash` is excluded by default and never appears in profile serializers.

## Access and refresh tokens

- Access token algorithm is fixed to HS256. The verifier checks signature, issuer, audience, expiry, `sub`, `sid`, role, `iat`, `exp`, and `jti`.
- Claims contain only user ID, session ID, role, and standard JWT timestamps/identifier.
- Access-token lifetime defaults to 900 seconds.
- Opaque refresh tokens contain 32 random bytes, are returned only through an HttpOnly cookie, and are stored as SHA-256 hashes.
- Cookie path is `/api/v1/auth`; lifetime is bounded by the session expiry and is not extended by refresh. Production cookies are Secure; development can use HTTP.
- Refresh and logout require an exact configured Origin and `X-CSRF-Protection: 1`.

## Single active Student session

`UserSession` includes the technical extension `roleAtIssue`. A partial unique index permits one ACTIVE session per `(userId)` when `roleAtIssue=STUDENT`; Admin sessions are not constrained by it. Student login revokes the previous Student session and creates the new session and login event inside a MongoDB transaction. A bounded retry handles unique-index contention. Concurrent login tests verify one ACTIVE Student session remains.

Each protected request reloads the session and user. It rejects missing, mismatched, expired, revoked, role-changed, or blocked sessions/users. A revoked JWT does not remain usable until its JWT expiry.

## Refresh rotation and replay

The `previousRefreshTokenHashes` technical extension retains up to five recent hashes. Rotation updates the current hash and bounded history in a transaction. If a retained old hash is used again, the active session is revoked with `REFRESH_TOKEN_REUSE`. Concurrent duplicate refresh tests verify one request can win while replay detection revokes the session. Hashes older than the bounded history still fail authentication but are no longer identifiable as a replay.

## Password reset and mail

Reset tokens use 32 random bytes, a 30-minute expiry, SHA-256 hash storage, and an atomic one-time consume. A reset revokes all active sessions, including Admin sessions; this is the selected security recommendation for BE-01. The forgot endpoint returns the same public body for known and unknown emails. No raw token is returned in JSON.

Development/test use `FakeEmailService`, whose deliveries are held in memory for tests. Production uses Nodemailer only when SMTP is configured. If SMTP is absent or a send fails, there is no claim that delivery succeeded. Real SMTP delivery was not tested.

## Login event extension

`login_events` records `userId` or null, `outcome`, `reasonCode`, IP address, user-agent, and timestamp. These are technical fields because the source schema names the collection but does not define its shape. Retention of IP/user-agent data remains an owner decision.
