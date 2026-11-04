# BE-01 Project Structure

The backend is a modular monolith. `src/app.ts` composes Express middleware and routers; `src/server.ts` validates configuration, connects MongoDB, prepares development indexes, starts the listener, and handles shutdown signals.

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/env.ts
│   ├── db/
│   │   ├── connection.ts
│   │   ├── ensure-indexes.ts
│   │   ├── index-migration.ts
│   │   └── models/
│   ├── http/
│   │   ├── csrf.ts
│   │   ├── error-handler.ts
│   │   ├── logger.ts
│   │   ├── request-id.ts
│   │   ├── server-lifecycle.ts
│   │   └── validation.ts
│   ├── modules/
│   │   ├── auth/
│   │   └── catalog/
│   ├── shared/
│   └── types/express.d.ts
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── support/
│   └── unit/
├── scripts/
├── openapi.yaml
├── .env.example
├── package.json
└── tsconfig.json
```

## Source files

- `config/env.ts`: Zod environment parsing and development/test database isolation rules.
- `db/connection.ts`: explicit `dbName` connection, replica-set check, disconnect, and transaction helper.
- `db/ensure-indexes.ts`: non-destructive `createIndexes()` for declared models; does not call `syncIndexes()`.
- `db/index-migration.ts`: read-only desired-vs-existing index plan with duplicate-key checks before a unique index can be applied.
- `db/models/`: `User`, `UserSession`, `PasswordResetToken`, `LoginEvent`, `Course`, `CourseSection`, `Lesson`, `MediaAsset`, and `SiteSettings`.
- `http/`: request IDs, privacy-safe structured request logging, request parsing/validation, exact-origin CSRF checks, centralized error envelope, security headers, and HTTP lifecycle helpers.
- `modules/auth/`: Zod input schemas, Argon2id password handling, JWT signing/verification, cookie and refresh rotation, email boundary, authentication middleware, role guard, and seven auth routes.
- `modules/catalog/`: safe public course projections, site settings allowlist, public media association checks, and four read-only routes.
- `app.ts`: injectable app factory; it does not open a listener or database connection.
- `server.ts`: runtime entry point; dotenv is loaded only here.

## Test and script files

- `tests/unit/config.test.ts`: environment validation and environment separation.
- `tests/unit/db-connection.test.ts`: unreachable database failure behavior.
- `tests/integration/backend.test.ts`: HTTP, MongoDB model, transaction, auth, public API, and lifecycle tests.
- `tests/contract/openapi.test.ts`: contract shape and reference tests.
- `tests/support/test-database.ts`: disposable MongoDB 8.0.34 replica-set lifecycle and isolated test database.
- `scripts/validate-openapi.ts`: YAML parsing, internal reference, response envelope, and BE-01 operation checks.
- `scripts/create-indexes.ts`: read-only by default; apply requires explicit local confirmation or staging target/replica-set/backup confirmations.
- `scripts/bootstrap-admin.ts`: one-time Admin creation command; never runs during server startup.
- `scripts/check.mjs`: cross-platform aggregate quality gate.

## Build output

`npm run build` emits `dist/`, ignored by Git. `npm start` runs `dist/src/server.js`. The BE-00 OpenAPI source is also copied to `backend/openapi.yaml`; the OpenAPI check fails if the two files drift.
