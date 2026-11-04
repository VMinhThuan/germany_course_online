# BE-06B Implementation Summary

**Status:** `CODE_PASS`; Git checkpoint and Vercel deployment are in progress.

## Implemented

- Added a default-exported Express handler at `backend/src/index.ts`, sharing `createApp` with the persistent `src/server.ts` VPS entrypoint. It does not start a listener, Admin bootstrap, index migration or continuous worker.
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

## Vercel state before checkpoint

- Authorized Hobby team access is available. Existing project `germany-course-online-new` is linked to `VMinhThuan/germany_course_online`, uses Vite, and has a READY Production deployment from `main` at `019fee34a2bb0c948b6ed9f116de74f02a50a7d5`.
- Existing deployment protection is SSO (`all_except_custom_domains`). It was not changed. Project build logs show Vite output in `dist`; the connector does not expose the Root Directory/build-setting fields, and Windows UI inspection could not initialize.
- No backend project is present yet. No Vercel environment values, MongoDB database, SMTP, S3 or bank service were configured or accessed.
- The API rewrite destination remains pending a verified backend project domain. The new source is not yet on `origin/main`, so no BE-06B deployment is claimed here.

See `GIT-CHECKPOINT-AND-PUSH.md`, `DEPLOYMENT-URLS-AND-SHAS.md` and `KNOWN-LIMITATIONS-AND-BLOCKERS.md` for the final release state.
