# Order Schema and Indexes

## `orders`

Fields follow the BE-00 schema catalog. Immutable purchase snapshots are `courseTitleSnapshot`, `coursePriceSnapshot`, `baseAmount`, `discountAmount`, `totalAmount`, and `durationMonthsSnapshot`. Amounts use MongoDB Decimal128 and must be nonnegative whole VND values. Order status retains `PENDING | PAID | FAILED | CANCELLED | EXPIRED`; this phase writes only PENDING and the conditional PENDING → PAID transition.

Lifecycle fields include `paymentSubmittedAt`, `reviewedById`, `reviewedAt`, `reviewNote`, `paidAt`, and nullable `expiresAt`. Optional `idempotencyKey` and `requestFingerprint` are private technical fields. No payment-provider or gateway transaction fields are stored.

Indexes:

- Unique `orderCode`.
- `{ userId: 1, createdAt: -1 }` for student history.
- `{ status: 1, paymentSubmittedAt: 1, createdAt: 1 }` for Admin review.
- `{ courseId: 1, userId: 1, createdAt: -1 }` for course/student order history.
- Unique `{ userId: 1, idempotencyKey: 1 }` when the key is a string.
- Proposed unique `{ userId: 1, courseId: 1 }` for PENDING PURCHASE orders to prevent concurrent duplicate purchases.

## `enrollment_adjustments`

Append-only GRANT/RENEW/REVOKE/RESTORE history uses the BE-00 fields. The purchase path records a GRANT with `orderId`, `performedById`, `durationMonths`, `previousExpiresAt: null`, and `newExpiresAt`.

Indexes:

- `{ enrollmentId: 1, createdAt: -1 }` timeline.
- Unique `{ orderId: 1, adjustmentType: 1 }` for non-null ObjectId order references.

## `audit_logs`

Approval and settings changes append actor, action, entity, sanitized old/new values, IP address, and creation time. Bank account, QR URL, email, and review note values are excluded from audit snapshots.

Indexes:

- `{ entityType: 1, entityId: 1, createdAt: -1 }` timeline.
- `{ actorUserId: 1, createdAt: -1 }` actor history.

## `email_logs`

The existing BE-00 collection serves as a durable outbox. Added proposal fields are `recipientType`, `templateData`, and a private `leaseToken`; `recipientEmail` is nullable for Admin fan-out, because active Admin recipients are resolved when the worker sends. Status values are PENDING, PROCESSING, SENT, and FAILED.

Indexes:

- Unique `dedupeKey`.
- `{ status: 1, availableAt: 1, leaseExpiresAt: 1 }` worker claim.
- `{ userId: 1, createdAt: -1 }` user history.

## Existing collections

`users`, `courses`, `enrollments`, and `site_settings` are reused. Existing unique enrollment index `{ userId: 1, courseId: 1 }` remains the second guard against duplicate grants. `site_settings.payment` remains a private Mixed field for backwards compatibility. No `payment_transactions` collection exists.

The app does not automatically create production indexes. Use `npm run db:indexes` for a read-only plan, review it, then follow the explicit staging-only apply requirements in [BE-06A](../../release-preparation/BE-06A/MONGODB-AND-INDEX-MIGRATION-PLAN.md). No production migration is authorized by that runbook.
