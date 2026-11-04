# BE-01 Test Results

## Final run

Command: `npm run check` from `backend/`.

| Check | Result |
|---|---|
| TypeScript strict typecheck | PASS |
| ESLint (`--max-warnings=0`) | PASS |
| Prettier format check | PASS |
| OpenAPI parse, internal references, operation checks, source-copy sync | PASS — OpenAPI 3.1, 67 paths, 821 internal refs, 11 BE-01 operations |
| Unit tests | PASS — 9 |
| MongoDB/API integration tests | PASS — 26 |
| Contract tests | PASS — 4 |
| Total tests | PASS — 39/39 |
| TypeScript production build | PASS |
| `npm audit` | PASS — 0 advisories |
| `npm audit --omit=dev` | PASS — 0 advisories |

The final check was run after changing the disposable replica-set binary to MongoDB 8.0.34 and applying the `minimatch` 11.0.4 override. Integration transactions were rerun successfully on that replica set.

## Coverage highlights

- Config validation, local database isolation, unreachable MongoDB handling, liveness/readiness, request ID, malformed/oversized JSON, CORS, secure headers, and HTTP shutdown.
- Registration, duplicate normalized email, role injection, Argon2 hash, login, blocked account, session replacement, concurrent login, JWT algorithm/expiry, owner binding, current session revocation, CSRF, refresh rotation and concurrent replay, repeat logout, and Student/Admin role behavior.
- Forgot-password enumeration response, reset-token hash, expiry, one-time consumption/replay, password replacement, and session revocation.
- Published course visibility, archive/draft/soft delete exclusion, pagination, sort/search/filter, exact large Decimal128 serialization, published outline filters, and protected lesson-content omission.
- Public settings/payment exclusion and public/private/unassociated/missing media metadata with storage-key redaction.
- OpenAPI reference, envelope, registration, auth result, and public outline contract checks.

## Test environment

- Node 22.18.0; npm 10.9.3.
- MongoMemory replica set, MongoDB 8.0.34, database `paniverse_lms_be01_test`.
- The test email service was fake/in-memory. No SMTP provider or external database was used.
- `npm run check` includes `npm run build`; it does not contact Vercel or deploy.
