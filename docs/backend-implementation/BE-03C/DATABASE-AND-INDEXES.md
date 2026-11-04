# Database and Indexes

## Model changes

- `renewal_plans`: required Decimal128 `price`, bounded duration and ACTIVE/INACTIVE status.
- `orders`: immutable renewal title/price snapshots, selected discount source, cancellation actor/time/reason, and reconciliation outcome.
- `coupons`: `reservedCount` plus redeemed count and status/date fields.
- `coupon_redemptions`: `RESERVED`, `REDEEMED`, `RELEASED`, and transition timestamps.
- `enrollment_adjustments`: private idempotency key and request fingerprint for manual Admin actions.
- `email_logs`: the six BE-03C template types.

## Important indexes

`ensure-indexes.ts` uses Mongoose `createIndexes()` and does not call `syncIndexes()`.

- Existing unique Enrollment `(userId, courseId)` remains the single-entitlement constraint.
- Orders retain separate partial unique pending PURCHASE and RENEWAL indexes over `(userId, courseId)`, filtered by `status=PENDING` and the corresponding `orderType`.
- Order idempotency remains unique per `(userId, idempotencyKey)` when a string key exists. Cancellation, Admin review, student history, and course/student history have query indexes.
- Coupon code is unique. Coupon status/listing is indexed.
- Coupon redemption `orderId` is unique. Coupon/status/history and user/history query indexes support reservation operations.
- Enrollment adjustments retain a unique order/type index for paid entitlement effects and add a unique actor/idempotency-key index for manual Admin actions.

## Deployment safety

No production migration was run. Before a future production rollout, inspect actual indexes and duplicates against these partial unique predicates, stage index creation, observe build/runtime compatibility, and roll back through an explicit operational migration plan. Do not automatically drop indexes or use `syncIndexes()` against production.
