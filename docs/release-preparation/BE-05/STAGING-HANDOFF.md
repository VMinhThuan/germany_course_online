# Staging Handoff

**Handoff status: code is locally verified for review; staging is not provisioned and release is NO-GO until blockers are closed.**

## Local evidence

- Frontend: 121/121 tests, lint/typecheck/build and Prettier pass.
- Backend: 87/87 tests, lint/typecheck/format/build and OpenAPI validation pass.
- Browser: retained BE-04 suite 4/4; BE-05 extended suite 7/7 on synthetic in-memory data.
- npm audit: zero reported vulnerabilities for frontend/backend, full and production-only dependency trees.
- No source-control mutation, deployment, production Atlas connection, real email, live payment, or provider upload occurred.

## Required owner sequence

1. Review the accumulated local `main` diff and approve the source-control checkpoint separately.
2. Select/provision an isolated staging database and persistent backend/worker runtime. Verify MongoDB replica-set transactions, indexes, backup and restore before loading any staging fixtures.
3. Configure exact frontend/API origins, HTTPS, refresh cookie, CSRF, secrets, structured redacted logs, health/readiness and monitoring.
4. Configure private S3-compatible storage and execute the full upload/verify/associate/read/delete lifecycle with a disposable asset.
5. Configure SMTP and a durable worker; verify delivery, retries, dedupe and restart with an approved test mailbox.
6. Have the business owner verify bank details/static QR and sign off the manual reconciliation procedure using only approved staging funds/data.
7. Run browser/security/accessibility checks against the deployed staging origin. Review all axe findings by severity and complete manual keyboard/screen-reader checks.
8. Record deployment SHA, environment version, database/index checkpoint, test evidence, rollback owner and go/no-go decision before any production release.

See [ENVIRONMENT-AND-DEPLOYMENT-PLAN.md](ENVIRONMENT-AND-DEPLOYMENT-PLAN.md), [MEDIA-STAGING-READINESS.md](MEDIA-STAGING-READINESS.md), [SMTP-AND-OUTBOX-READINESS.md](SMTP-AND-OUTBOX-READINESS.md), and [PAYMENT-OPERATIONS-CHECKLIST.md](PAYMENT-OPERATIONS-CHECKLIST.md) for operational detail.
