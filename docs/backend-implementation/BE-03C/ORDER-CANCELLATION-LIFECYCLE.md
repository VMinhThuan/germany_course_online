# Order Cancellation Lifecycle

## Student cancellation

`POST /api/v1/orders/:orderId/cancel` is owner-scoped and permits only `PENDING` Orders with `paymentSubmittedAt=null`. A compare-and-set changes the status to `CANCELLED`, records actor/time and a server-selected reason, releases any coupon reservation, and writes an audit event. Repeating cancellation by the owner is safe. Foreign orders remain not found; transfer-submitted and paid orders are rejected.

## Admin cancellation

`POST /api/v1/admin/orders/:orderId/cancel` accepts a nonempty reason and either `NO_FUNDS_RECEIVED` or `REFUND_CONFIRMED_EXTERNALLY`. These values record the operator's manual bank reconciliation. The endpoint does not execute, simulate, or issue a refund. Admin cancellation is allowed only while the Order is `PENDING`; this lets an operator resolve submitted-transfer orders after review. It atomically changes status, releases a coupon reservation, audits the action, and queues a student cancellation email.

## No automatic expiry

`OrderStatus.EXPIRED` remains for compatibility, but BE-03C adds no scheduled expiry or automatic transition. `PENDING` Orders and their coupon reservations may remain open indefinitely. The approval and cancellation paths both compare the current Order state, so only one can win a race.
