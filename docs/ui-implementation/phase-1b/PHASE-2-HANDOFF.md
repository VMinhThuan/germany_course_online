# Phase 2 Handoff

## What can be composed now

- Public landing/course catalog/detail/preview screens from `catalog` components and the Phase 1A `PublicShell`.
- Course tree, section, lesson, media and access states from `learning` and `media`.
- File exercise and quiz attempt/result screens from `exercises` and `quizzes`.
- Dashboard, progress, continue-learning and lesson notes from `progress`.
- Checkout/order/renewal/payment presentation from `commerce` plus `enrollment`.
- Profile and safe-session screens from `account`, with Phase 1A form controls.
- The existing Phase 1A auth and layout primitives remain available; no auth product flow was introduced here.

## Required before real backend integration

1. Confirm API route/method/DTO schemas and endpoint-specific error details against the V3 implementation.
2. Confirm public course projection, filters/pagination, hidden/draft handling and authorized course/lesson access.
3. Decide how preview is represented and authorized server-side, including approved provider/media URLs.
4. Confirm exercise completion and solution access response capabilities, exact exercise asset mapping, and signed URL refresh behavior.
5. Confirm quiz result/review/retry DTO and policy. Keep correct answers out of attempt-start models.
6. Confirm progress formula, eligible lesson denominator, zero-progress behavior and note conflict/update behavior.
7. Confirm payment provider/order creation/status refresh, coupon response, idempotency, and when enrollment becomes available. Never let a client set payment success.
8. Confirm editable profile fields, validation and session list/revoke behavior.
9. Confirm renewal expiry calculation and month-end policy in backend; keep arithmetic server-authoritative.
10. Add DTO validation/adapters at the data boundary, use repository ports, and retain loading/empty/error states.

## Production boundary

The current `main.tsx` selects `App` only in development and `ProductionApp` in production. The new route, scenario controls, and mock fixtures are imported only by the dev application. Keep this split or lazy-load a confirmed production route in a future phase. Verify built assets and the production smoke test after any entry change.

Phase 1B stops here. Phase 2 product screens are not part of this change.

