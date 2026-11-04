# BE-01 Implementation Summary

## Status

**BE-01 implementation: PASS. Production operations: PARTIAL until an approved replica-set database, production secrets, SMTP, and Admin bootstrap are configured.**

The Express/TypeScript backend is implemented under `backend/`. The HTTP app is separate from its listener. Authentication, server-side sessions, role checks, public course reads, public site settings, public media metadata, OpenAPI, and an isolated MongoDB replica-set test suite are present.

## Implemented endpoints

Authentication:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `GET /api/v1/auth/me`

Public:

- `GET /api/v1/courses`
- `GET /api/v1/courses/:slug`
- `GET /api/v1/site-settings/public`
- `GET /api/v1/media/:assetId/metadata`

Operations and documentation:

- `GET /health` and `GET /ready`
- `GET /api/openapi.yaml` and `GET /api/docs`

The Admin guard fixture at `GET /api/v1/auth/__test/admin` is registered only in `NODE_ENV=test` and is absent from other environments.

## Verification

`npm run check` passed locally on Node 22.18.0:

- TypeScript strict typecheck, ESLint, Prettier, OpenAPI validation, and production TypeScript build passed.
- 39 tests passed: 9 unit, 26 integration, and 4 contract tests.
- MongoDB transaction tests used a disposable local MongoDB 8.0.34 replica set through `mongodb-memory-server`; they did not connect to Atlas.
- `npm audit` and `npm audit --omit=dev` reported no vulnerabilities after pinning the patched `minimatch` version for the lint toolchain.

See [TEST-RESULTS.md](TEST-RESULTS.md) for commands and coverage details.

## Important behavior

- Registration creates an ACTIVE STUDENT and returns a safe user profile. It does not create a session. This remains **PROPOSED** in the OpenAPI change log until product approval.
- A new STUDENT login revokes the previous active STUDENT session in a transaction. ADMIN sessions remain multi-session.
- Access tokens last 900 seconds by default. Refresh sessions last 30 days by default; refresh rotation does not extend the session expiry.
- The refresh cookie is HttpOnly, host-only, scoped to `/api/v1/auth`, and Secure in production. Refresh and logout require an exact allowed Origin and the `X-CSRF-Protection: 1` header.
- Rotated refresh token hashes are retained in a bounded history of five. A detected replay revokes the active session.
- Public prices are MongoDB Decimal128 VND integers serialized directly to decimal strings.
- Public course reads only return published, non-deleted courses, sections, lessons, and explicitly public associated media metadata.

## Operational limitations

- SMTP is not configured here. Development and tests use an in-memory fake mail service; production password-reset email delivery is unavailable until SMTP and `PASSWORD_RESET_URL` are configured.
- No external development or production MongoDB was configured or written. The test database was temporary and isolated.
- No Admin account or bootstrap credential was created.
- Media upload, storage-provider integration, and actual public asset delivery are outside this phase. Metadata responses omit asset URLs; public site `logoUrl` and catalog `thumbnailUrl` are currently `null`.
- No frontend adapter, BE-02, payment, learning, or Admin CMS work was added.
- Changes are local and uncommitted. No push or deployment was performed, as required by the BE-01 prompt.

## Owner decisions still needed

- Approve the proposed registration-without-login behavior.
- Provide production MongoDB target, secret management, frontend origin, SMTP configuration, and reset URL before production use.
- Approve an Admin bootstrap procedure and media provider/public URL policy.
- Define retention for login-event IP address and user-agent data.

## BE-02 readiness

The foundation is ready for BE-02 planning. Before adding authenticated learning/media APIs, resolve the data and media-provider policies listed in [BE-02-HANDOFF.md](BE-02-HANDOFF.md). No BE-02 code is included.
