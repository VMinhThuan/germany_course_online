# Renewal Order Transactions

## Quote and creation

The existing checkout quote and order-create APIs accept `orderType=RENEWAL` with a course and active `renewalPlanId`. The server checks the published course, ACTIVE enrollment (including expired timestamp), plan/course relationship, plan status and values, and a conflicting pending renewal. Client-supplied amount, duration, discount, and expiry values are not accepted.

Order creation snapshots the course title, renewal plan ID/title/price, duration, base amount, selected discount and total. It creates only a `PENDING` Order. Enrollment expiry does not change before Admin approval. The existing bank-transfer configuration check remains fail-closed.

## Approval transaction

The existing Admin approval transaction is shared by PURCHASE and RENEWAL. For RENEWAL it verifies a submitted transfer and an existing non-REVOKED enrollment, transitions the Order from `PENDING` with compare-and-set, and updates that same enrollment. The base date is the later of approval time and the stored enrollment expiry; the frozen duration is applied with `addUtcCalendarMonths` from `commerce/dto.ts`. It appends one `RENEW` adjustment associated with the Order, finalizes a reserved coupon if present, writes audit history, and queues the student confirmation email.

The transaction does not create a second enrollment and does not touch lesson progress, exercise progress, Quiz attempts, or lesson notes. The Order's snapshots are not repriced from the current plan during approval. The Order transition, enrollment write, adjustment, coupon transition, audit, and outbox insert commit or roll back together.

## Idempotency and concurrency

The pending Order compare-and-set prevents a second approval from extending access twice. The unique `(orderId, adjustmentType)` adjustment index supplies an independent exactly-once guard. Concurrent enrollment writes share MongoDB conflict detection and conditional state checks; callers receive a conflict instead of a silent overwrite.
