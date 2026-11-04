# BE-04 Handoff

## BE-03C baseline to consume

BE-03C leaves a transactional Express/Mongoose backend for quiz completion, renewal checkout and approval, coupon capacity, second-purchase discounts, pending cancellation, and Admin enrollment changes. Use the canonical contract at `docs/backend-design/BE-00/openapi.yaml`; keep `backend/openapi.yaml` synchronized. `schema-catalog.json` now documents renewal price, order snapshots, coupon reservation lifecycle, adjustment idempotency, and current indexes.

## Integration points

- Student coupon validation: `POST /api/v1/coupons/validate`.
- Student renewal plans: `GET /api/v1/renewals/courses/:courseId/plans`.
- Checkout: `GET /api/v1/checkout/quote` and `POST /api/v1/orders` with PURCHASE or RENEWAL context.
- Student/Admin cancellation: `POST /api/v1/orders/:orderId/cancel` and `POST /api/v1/admin/orders/:orderId/cancel`.
- Admin plan/coupon CRUD and enrollment grant/revoke/restore/extend are documented in OpenAPI.

## Before widening rollout

1. Build frontend API adapters and Admin screens against the typed DTOs; do not send client-calculated prices or expiries.
2. Confirm whole-VND percentage rounding with the product/accounting owner.
3. Configure real SMTP and a persistent worker, then verify retry/dedupe behavior with an approved test mailbox.
4. Review production index duplicates and create the new indexes using a staged migration plan; do not use `syncIndexes()`.
5. Configure real bank details and manually test the operational transfer-review/cancellation process.
6. Add browser E2E coverage for checkout, renewal, coupon selection, and Admin workflows before production release.

BE-04 is not implemented in this handoff. No frontend, production database, deployment, commit, or push was performed as part of BE-03C.
