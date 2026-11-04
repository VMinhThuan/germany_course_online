# BE-03A Implementation Summary

## Status

- **Implementation:** PASS. Final local quality gates passed on this tree.
- **Operational readiness:** PARTIAL. No real bank settings, SMTP delivery, production MongoDB, or deployment was configured or verified.
- **Scope:** Standard PURCHASE only, static admin-supplied bank transfer instructions, student transfer report, manual Admin approval, initial enrollment grant, and two durable email notification events.

## Implemented journey

1. An authenticated STUDENT requests a server-calculated VND quote.
2. The student creates a PENDING order. The backend verifies an enabled bank configuration and snapshots course title, course price, base amount, zero discount, total, and duration.
3. The student receives the exact order code, amount, and static payment details. The QR itself has no generated order amount or reference.
4. The student reports the transfer. A MongoDB transaction records `paymentSubmittedAt` and a deduplicated Admin email outbox row. The order remains PENDING.
5. An ADMIN compares the transfer with the bank statement and approves it.
6. One MongoDB transaction changes PENDING to PAID, creates an ACTIVE enrollment and GRANT adjustment, appends a redacted audit event, and queues the student approval email.
7. Existing BE-02 entitlement checks see the grant immediately after commit.

## Source files

- Added models: `backend/src/db/models/order.ts`, `enrollment-adjustment.ts`, `audit-log.ts`, and `email-log.ts`.
- Added commerce module: `backend/src/modules/commerce/schemas.ts`, `dto.ts`, `service.ts`, `routes.ts`, and `email-outbox-worker.ts`.
- Extended app/server integration: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/http/server-lifecycle.ts`, and `backend/src/modules/auth/email-service.ts`.
- Extended model exports, index creation, test database cleanup, OpenAPI validation, and contract tests.
- Added `backend/tests/integration/commerce.test.ts`.
- Updated canonical `docs/backend-design/BE-00/openapi.yaml` and byte-synchronized `backend/openapi.yaml`.

## Deliberate fail-closed behavior

- RENEWAL returns `RENEWAL_NOT_SUPPORTED`.
- A supplied coupon code returns `COUPONS_NOT_ENABLED`.
- Zero-price purchases return `ZERO_PRICE_UNSUPPORTED`.
- Missing or disabled bank instructions return `PAYMENT_CONFIGURATION_UNAVAILABLE` before an order is inserted.
- A pre-existing enrollment or another PENDING purchase blocks a new PURCHASE. This is a conservative technical proposal, including revoked or expired enrollment rows.
- No Admin rejection, payment gateway, webhook, payment transaction collection, renewal extension, automatic discount, or frontend adapter was added.

## Provenance and operational boundary

The collections and lifecycle follow BE-00 and the BE-03A request. Proposed order price snapshots, idempotency fingerprint, pending-purchase uniqueness, email lease/token fields, notification recipient type/template data, and an HTTPS hosted QR reference are documented as technical extensions. The existing `site_settings.payment` field remains private and the public site-settings projection remains allowlisted.

Only isolated MongoDB replica-set tests were used. No Atlas URI, production database, real bank data, SMTP credentials, deployment, commit, or push was used.
