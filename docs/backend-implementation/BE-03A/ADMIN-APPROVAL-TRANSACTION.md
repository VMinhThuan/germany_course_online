# Admin Approval Transaction

`POST /api/v1/admin/orders/:orderId/approve` requires an active ADMIN session and a PENDING order with a recorded student transfer report.

One existing `withTransaction` transaction performs the following work:

1. Re-read the order and require PENDING plus non-null `paymentSubmittedAt`.
2. Reject if an enrollment already exists for the student/course. Existing progress and expiry are never overwritten.
3. Compare-and-set the order from PENDING to PAID and set `paidAt`, `reviewedById`, `reviewedAt`, and the optional Admin review note.
4. Create a new ACTIVE enrollment with `sourceOrderId`, current activation time, and expiry from the duration snapshot.
5. Append one GRANT enrollment adjustment.
6. Append a redacted `ORDER_APPROVED` audit record.
7. Insert the deduplicated `ORDER_APPROVED_STUDENT` outbox event.

Any exception aborts all seven effects. A duplicate/previously approved request returns HTTP 409 and cannot add another enrollment, adjustment, audit record, or email event. Two concurrent approval requests were exercised against the isolated replica set; one commits and the other conflicts.

`reviewNote` is available only in Admin order DTOs. Student DTOs omit reviewer ID/time and internal review notes. Audit values include only status, order code, amount, timestamps, and enrollment ID; no bank details or review note are copied into audit logs.
