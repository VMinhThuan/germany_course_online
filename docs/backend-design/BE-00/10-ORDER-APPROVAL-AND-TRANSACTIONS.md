# Manual Order Approval and Transaction Design

## Order lifecycle

```mermaid
sequenceDiagram
  participant S as Student
  participant API as Commerce API
  participant DB as MongoDB
  participant A as Admin
  participant W as Email worker
  participant SMTP as SMTP
  S->>API: POST /orders (course/plan/coupon)
  API->>DB: Validate price/coupon; create PENDING order + redemption
  DB-->>API: committed order snapshots + orderCode
  API-->>S: order + static bank instructions + amount/reference
  S->>API: POST /orders/{id}/confirm-transfer
  API->>DB: Set paymentSubmittedAt + deduped admin email outbox
  API-->>S: still PENDING; derived state = awaiting review
  W->>DB: lease pending email
  W->>SMTP: send admin notice
  A->>API: POST /admin/orders/{id}/approve
  API->>DB: transaction: CAS PENDING→PAID; upsert entitlement; adjustment; audit; student outbox
  DB-->>API: commit once
  API-->>A: approved order + enrollment projection
  W->>SMTP: send student confirmation after commit
```

## `POST /api/v1/orders`

1. Authenticate active Student; validate `courseId`, optional `orderType`, `renewalPlanId`, `couponCode`, optional `Idempotency-Key`.
2. Load a published/nondeleted course and its current `price`/duration. For renewal, require the existing enrollment and an active plan belonging to the same course; use plan price only after `renewal_plans.price` is approved.
3. Normalize coupon code; validate status, dates, usage cap, discount basis and owner-approved stacking/eligibility policy. Recompute all money server-side using decimal arithmetic.
4. In one Mongo transaction, atomically reserve coupon capacity (if limited), insert PENDING order with immutable title, price/base, duration, discount, total snapshots, and insert redemption. Create unique orderCode before response. Replaying the same idempotency key/fingerprint returns the same order; reusing key with a different payload is 409 (**REC**).
5. Return order detail and the allowlisted static payment instructions needed for checkout. No enrollment is created by order creation.

## `POST /orders/{id}/confirm-transfer`

Verify caller owns the order. Only `PENDING` is eligible. If `paymentSubmittedAt` already exists, return the same PENDING representation and do not enqueue another email. Otherwise, one transaction conditionally sets timestamp and inserts a unique email outbox row with a stable `dedupeKey` tied to order + transfer-submitted event. Do not set `PAID`, `paidAt`, `reviewedById`, or enrollment. External transfer is not verified by the app.

## Admin approve atomic unit

The service executes one transaction with bounded retry on transient Mongo transaction errors:

1. Read order; require `status=PENDING` and non-null `paymentSubmittedAt`.
2. Compare-and-set `{_id,status:'PENDING',paymentSubmittedAt:{$ne:null}}` to `PAID`, set `paidAt`, `reviewedById`, `reviewedAt`, optional redacted `reviewNote`. `modifiedCount` must be exactly one.
3. For PURCHASE, upsert unique `(userId,courseId)` enrollment with source order, activation time and expiry derived from snapshot duration. For RENEWAL, extend existing enrollment from `max(now,current expiresAt)` when valid; keep progress unchanged.
4. Insert one `enrollment_adjustments` event keyed to the order/type; unique partial order index is a second exactly-once guard.
5. Insert one redacted audit row and one deduped student-confirmation outbox row.
6. Commit, then return approved projection. If the transaction aborts, no partial PAID/enrollment/audit/email schedule persists.

If a repeated request finds PAID, return a conflict/already-approved response without repeating enrollment effects. Two concurrent Admins cannot both win the conditional status update. Payment email delivery may retry independently and never reverses PAID.

## Renewal expiry calculation

Recommendation: `anchor = max(nowUtc, existing expiresAt when status ACTIVE and unexpired)`; add `durationMonths` as calendar months in UTC, clamping day to the final valid day of target month and preserving time-of-day. Example: Jan 31 + 1 month → Feb 28/29. This avoids JavaScript month overflow, but the day-clamp policy and leap-year convention are **OPEN_DECISION** and must be owner-approved. `previousExpiresAt`, `newExpiresAt`, `durationMonths`, order and actor are recorded in adjustment history.

## Coupon consistency

Do not implement usage cap as “count first, insert later.” An atomic conditional increment of proposed `coupons.redemptionCount` and the order/redemption insertion belongs in the same transaction. Unique `coupon_redemptions.orderId` prevents duplicate consumption on retries. Whether failed/abandoned pending orders consume a coupon slot, when expired orders release capacity, per-user limits, and coupon stacking remain open.

## Email outbox

`email_logs` becomes a minimal Mongo-backed outbox: `PENDING → PROCESSING(leased) → SENT` or retryable `PENDING`/terminal `FAILED`. Worker claims rows atomically by `availableAt`, lease expiry, and status; uses exponential backoff with a bounded max attempt count; stores provider message ID and a sanitized error code/message. Unique `dedupeKey` makes enqueue idempotent. A daily UTC worker schedules 7-day enrollment reminders with a key including enrollment and the exact expiry timestamp, so renewal allows a new reminder. No Redis or queue service is required for initial scale.
