# Test Results

## Local test coverage

The BE-03A suite uses the same isolated MongoDB 8.0.34 replica-set support as BE-01/BE-02 and the test-only database `paniverse_lms_be01_test`. It does not connect to Atlas or another external database.

Coverage includes quote/order creation, exact VND serialization, immutable snapshots, missing/disabled payment configuration, hidden/free courses, renewal/coupon rejection, idempotent replay and mismatched-key conflict, manipulated amount rejection, owner isolation, concurrent transfer confirmation, outbox deduplication and retries, PENDING entitlement denial, Admin role enforcement, Admin review context, concurrent approval, rollback on outbox conflict, existing enrollment preservation, settings updates/public projection, UTC end-of-month/leap-year expiry, and post-approval BE-02 entitlement APIs.

Final local results:

- `npm run check`: PASS — strict TypeScript typecheck, ESLint, Prettier, OpenAPI parse/reference/synchronization validation, tests, and production TypeScript build.
- Tests: **61 passed across 7 test files**, including the pre-existing BE-01/BE-02 regression and new commerce, MongoDB transaction/concurrency, and OpenAPI contract coverage.
- OpenAPI validator: PASS — 67 paths, 844 internal references, 11 BE-01 operations, 18 BE-02 operations, and 10 BE-03A operations.
- `npm audit`: PASS — 0 vulnerabilities.
- `npm audit --omit=dev`: PASS — 0 vulnerabilities.

## Evidence limits

Fake notification delivery proves template construction, outbox state transitions, and retry behavior only. It does not verify SMTP credentials/provider acceptance. No Atlas indexes, production data, bank transfer, deployment, or frontend behavior was exercised.
