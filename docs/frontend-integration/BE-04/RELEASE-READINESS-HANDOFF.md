# Release Readiness Handoff

## Recommendation

**Ready for a release-preparation review, not ready for production release.** Frontend build/unit checks, backend regression/contract checks, isolated browser purchase/learning/session journeys, and the targeted axe gate passed. Production remains **PARTIAL** until external and untested behavior is reviewed.

## Required before production

1. Configure and verify the production API URL, CORS allowed origin, secure refresh-cookie attributes, CSRF protection, HTTPS and deployment secrets.
2. Connect a real S3-compatible media provider, bucket CORS and signing credentials; test a non-customer fixture upload and entitled playback in staging.
3. Configure SMTP and the persistent email worker; verify forgot/reset delivery and retry/deduplication with an approved test mailbox.
4. Confirm bank details and static QR with the business owner, then test manual order reconciliation/cancellation in staging. A student report is not proof of payment.
5. Add/execute browser coverage for renewal extension/progress preservation, cancellation and coupon reservation edge cases, two-Student order isolation, Admin CMS CRUD and enrollment/student mutations.
6. Review cross-origin refresh, CSRF, CSP, logging, dependency baseline and accessibility across responsive routes using staging configuration.
7. Re-run frontend/backend checks against the exact release tree and confirm canonical/runtime OpenAPI remain synchronized.

## Commands and results

- Frontend: `cd frontend; npm run check` — PASS, including 19 Vitest files / 121 tests and production build.
- Isolated browser: `cd frontend; npm run e2e:be04` — PASS, 4/4 tests (3 business/security flows plus axe on three pages).
- Backend: `cd backend; npm run check` — PASS, including 9 Vitest files / 86 tests and OpenAPI validation (75 paths / 96 operations).
- Frontend + backend `npm audit` — PASS, 0 known vulnerabilities reported for each tree at audit time.

## Tree handling

This work remains on local `main` and is uncommitted. The existing untracked `backend/`, `docs/backend-design/`, and `docs/backend-implementation/` content was preserved. No commit, push, deployment or production-data mutation was performed, as required by BE-04.
