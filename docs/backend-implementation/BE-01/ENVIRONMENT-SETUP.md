# BE-01 Environment Setup

## Requirements

- Node.js 22.12 or later. The implementation and complete check ran on Node 22.18.0.
- A MongoDB replica set for runtime use because login/session replacement, refresh rotation, and reset consumption use transactions.
- No database URI or secret is included in source control.

## Install and configure local development

From `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env` locally. Keep the explicit local replica-set URI and database name, and replace the JWT placeholder with a random secret of at least 32 characters. For example, generate a secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

The example URI uses `127.0.0.1`, database `paniverse_lms_dev`, and replica set `rs0`. Configure a local MongoDB instance with that replica-set name before running the API. Development and test environments reject non-loopback MongoDB hosts. Test mode also requires a database name containing `test`.

Run:

```powershell
npm run dev
```

The development server validates configuration, connects to the explicit database, verifies replica-set support, and creates declared indexes. It does not seed data.

## Disposable tests

```powershell
npm test
npm run test:integration
```

Integration tests start a disposable local MongoDB 8.0.34 replica set with `mongodb-memory-server`, use `paniverse_lms_be01_test`, and clear collections between tests. The first test run downloads the MongoDB binary if it is not cached. It does not use DBX, Atlas, or a production database.

## Environment variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP listener port; default `4000` |
| `MONGODB_URI` | MongoDB connection URI; never log it |
| `MONGODB_DB_NAME` | Required explicit database name passed as Mongoose `dbName` |
| `JWT_ACCESS_SECRET` | At least 32 characters; use a managed secret in production |
| `JWT_ISSUER` | Expected JWT issuer URL |
| `JWT_AUDIENCE` | Expected JWT audience |
| `ACCESS_TOKEN_TTL_SECONDS` | Access token lifetime; default `900`, allowed 60–3600 |
| `SESSION_TTL_DAYS` | Refresh-session lifetime; default `30`, allowed 1–365 |
| `APP_ORIGINS` | Comma-separated exact frontend origins, with no paths or wildcard |
| `COOKIE_SECURE` | Must be `true` in production; `false` is for local HTTP development |
| `COOKIE_SAME_SITE` | `lax`, `strict`, or `none`; `none` requires Secure in production |
| `PASSWORD_RESET_URL` | Frontend reset URL; required when SMTP is configured |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | SMTP server and sender; all required together |
| `SMTP_USER`, `SMTP_PASSWORD` | Optional SMTP authentication; must be supplied together |

Blank SMTP values in `.env.example` are treated as unconfigured. Development/test then use a fake in-memory mail service. Production without SMTP does not generate reset tokens or send mail; the HTTP response remains generic.

## Index management

Development startup ensures declared indexes with `createIndexes()`. `npm run db:indexes` now builds a read-only plan by default and reports missing, present, conflicting, duplicate-key, and extra indexes. No extra index is dropped. Applying locally requires `--apply`:

```powershell
npm run db:indexes -- --apply
```

Remote apply is limited to an explicitly confirmed staging database using production runtime semantics. It requires exact database/host/replica-set confirmations and a non-secret backup checkpoint ID. Production-named databases are rejected by this BE-06A tool. Review [BE-06A MongoDB and Index Migration Plan](../../release-preparation/BE-06A/MONGODB-AND-INDEX-MIGRATION-PLAN.md) before use. Do not use `syncIndexes()` or assume unique-index creation will succeed if duplicates exist.

## Production prerequisites

- Set `NODE_ENV=production`, an environment-specific `MONGODB_DB_NAME`, a replica-set URI, and a managed JWT secret. For staging, use a staging-specific name such as `paniverse_lms_stage`; never use a test database or reuse production credentials.
- Set `COOKIE_SECURE=true`, exact production `APP_ORIGINS`, and the selected `COOKIE_SAME_SITE` behavior.
- Configure SMTP and `PASSWORD_RESET_URL` if password-reset email is expected.
- Create/verify indexes through an approved migration process before starting production traffic.
- Configure an approved Admin bootstrap path. No Admin credential or bootstrap endpoint is supplied by BE-01.

Production environment setup and database provisioning were not performed in this implementation.
