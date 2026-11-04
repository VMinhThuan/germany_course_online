# BE-06B Implementation Summary

**Status:** `CODE_PASS`; implementation SHA `3063a1ee889fb97bf10449925c9faeb1f3685a7e` is pushed to `origin/main`; GitHub Actions passed and both Vercel Production builds are `READY`. Live backend operations remain blocked by empty environment configuration and SSO-protected proxy access.

## Implemented

- Added a Vercel Express entrypoint at `backend/src/index.ts`, which directly imports Express and mounts the Vercel handler so the platform detects the application. It shares business routes from `src/application.ts` with the persistent VPS entrypoint `src/persistent-server.ts`. It does not start a listener, Admin bootstrap, index migration or continuous worker.
- Added serverless-safe lazy MongoDB connection reuse: concurrent cold requests share one connection attempt, failures can retry, the connection stays warm, selection timeout is five seconds and pool size is five.
- When required backend configuration is absent or invalid, Vercel can still serve liveness at `/health`; `/ready` and API requests fail closed with redacted `503 CONFIGURATION_UNAVAILABLE` responses. With valid configuration, normal shared API behavior is used.
- Added protected `GET /api/internal/email-outbox/process`. It checks a minimum 32-character `CRON_SECRET` using a constant-time digest comparison, then processes at most one message per invocation. VPS polling remains shared and is capped at ten per batch.
- Added `backend/vercel.json`, frontend SPA fallback, read-only GitHub Actions quality gates, and the 18 required BE-06B documents.

## Local validation

- Frontend: 121 tests pass; typecheck, lint, production build and format check pass.
- Backend: 101 tests pass; typecheck, lint, build, formatting and OpenAPI validation pass (75 paths / 96 operations).
- Browser E2E: BE-04 4/4 and BE-05 7/7 pass against isolated MongoMemory fixtures; BE-05 reports 37 axe route/viewport scans with no findings.
- Full and production-only `npm audit`: zero vulnerabilities for both projects.
- `git diff --check`: pass. The location-only credential scan found only invalid-domain examples and synthetic validator fixtures; no real credential was found.

## Vercel deployment state

- Frontend project `germany-course-online-new` is linked to the repository; deployment `dpl_7YNB57foyzrEDMoMpwuqM8AuWjPz` is `READY` from `main` at the implementation SHA. Read-only GETs to `/` and `/courses` returned 200. SSO remains enabled.
- Backend project `paniversedeutsch-backend` uses Express and Node 22.x; deployment `dpl_AdRW7A4okNbVxBggNgZSxyzPV1j3` is `READY` from the same SHA. `/health` returned 200. `/ready`, OpenAPI, and public courses returned `503 CONFIGURATION_UNAVAILABLE` because its environment inventory is empty.
- Frontend `/api/:path*` points to the backend `git-main` alias, but the authenticated-fetch smoke encountered a Vercel authentication redirect at the protected backend. SSO was not changed.
- No MongoDB environment, database, SMTP, media-store, bank service or commercial operation was configured or accessed. No paid upgrade was made. This is not an `OPERATIONAL_PASS` release.

See `GIT-CHECKPOINT-AND-PUSH.md`, `DEPLOYMENT-URLS-AND-SHAS.md` and `KNOWN-LIMITATIONS-AND-BLOCKERS.md` for the final release state.
