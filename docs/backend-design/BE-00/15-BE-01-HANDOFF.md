# BE-01 Handoff

## Start point

Implement only the first milestone from [14-BACKEND-IMPLEMENTATION-ROADMAP.md](14-BACKEND-IMPLEMENTATION-ROADMAP.md): Express application foundation, environment parsing, shared middleware/error shape, Mongo connection capability check, auth/session, RBAC, and public course/settings reads. Do not start learner learning, commerce, payment, Admin CMS, or frontend integration as part of BE-01.

## Approved architecture baseline

- Node.js LTS + Express + strict TypeScript.
- MongoDB/Mongoose + Zod, modular monolith.
- Argon2id passwords; short-lived access JWT containing `sub`, `sid`, role and standard registered claims; opaque refresh token stored only as hash in `user_sessions`.
- Current demo frontend is mock-backed; no existing API base URL or backend implementation was found.
- Public read projections must filter unpublished/deleted hierarchy and serialize BSON IDs/price safely.
- Student login revokes the previous Student session; all protected API requests validate session state.
- API prefix `/api/v1`; OpenAPI source is [openapi.yaml](openapi.yaml).

## Blockers and prerequisites

Before production-ready implementation, select allowed origin(s), API hostname/cookie scope, CSRF mechanism, token lifetimes, verified Admin bootstrap method, and real secret storage. Require a Mongo replica set for transactional session replacement. Do not place the user-provided URI in source, documentation, commands, telemetry, or committed environment files. DBX inventory had no LMS database; use a separate explicitly named development database and confirm owner/environment before any write.

## Initial modules and collections

Implement `config`, `http`, `db`, `modules/auth`, and `modules/catalog`. Initial models: `users`, `user_sessions`, `login_events`, `password_reset_tokens`, `courses`, and `site_settings`; build remaining models only when their milestone begins. Validate unique/index migrations against duplicates first. `login_events` and reset-token fields are recommendations because the PDF provides names only.

## First implementation acceptance checklist

- [ ] Node/TS/Express app starts and closes cleanly; invalid/missing required env fails fast without exposing secret values.
- [ ] Request ID and normalized common error envelope exist.
- [ ] `users.email` is normalized and uniquely indexed; password uses Argon2id; registration always creates STUDENT.
- [ ] Login creates `user_sessions`, returns safe DTO/access token, sets refresh cookie; previous Student session is atomically revoked.
- [ ] Refresh rotates raw token and persists hash only; logout/revocation and expired/blocked users reject access.
- [ ] Protected API validates JWT claims plus `sid` session ownership/status/expiry and supports `SESSION_REVOKED`.
- [ ] Role guard denies Student access to Admin routes; Admin bootstrap is out-of-band and audited.
- [ ] Public course list/detail only expose published/nondeleted content and exact money strings.
- [ ] OpenAPI endpoint contracts parse and correspond to implemented methods/responses; Supertest and replica-set integration coverage exists.
- [ ] No MongoDB mutation is performed against an ambiguous database/connection; no gateway or payment route is introduced.

## Scope stop

BE-00 design is complete. This handoff does not authorize automatic implementation of BE-01 or DB changes; wait for the separate implementation request. Continue to BE-01 only when asked.
