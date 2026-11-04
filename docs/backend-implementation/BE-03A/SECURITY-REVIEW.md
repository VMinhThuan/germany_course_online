# Security Review

## Authorization and ownership

- All commerce endpoints require bearer authentication and the appropriate STUDENT or ADMIN role.
- Student order lookup/transfer confirmation includes both order ID and authenticated owner ID; a foreign order returns 404.
- Only ADMIN can review/approve or change bank settings.
- Existing BE-02 session, account status, role consistency, and course entitlement checks remain in place.

## Money and state

- Course price is read from MongoDB Decimal128. Amounts are integer VND strings; no JavaScript floating point is used for order math.
- Order money/title/duration snapshots are immutable. Client amount fields are rejected by strict request validation.
- Transfer confirmation never changes status to PAID. Approval requires the transfer timestamp and uses CAS inside a MongoDB transaction.
- Existing enrollment blocks a grant; unique enrollment/adjustment/outbox indexes guard retries and concurrency.

## Payment data and logs

- No bank data is seeded. Enabled configuration requires nonempty transfer fields and an HTTPS QR URL without embedded URL credentials.
- Payment configuration remains in `site_settings.payment`, excluded from public settings and accessible only through Admin settings or the owning order's pending checkout detail.
- Audit snapshots omit bank fields, QR URL, student email/name, and review note. The outbox stores only student information needed to render its notification.
- Provider exceptions are replaced with sanitized error messages/codes in the outbox. HTTP errors never return raw database error text.
- No payment webhook, `payment_transactions` collection, provider SDK, or automatic payment verification exists.

## Remaining review items

- Operations must choose a hosted QR domain/reference and verify the actual static image and recipient bank details before enabling transfers.
- Production must use approved secrets, MongoDB TLS/network controls, and a runtime that reliably runs the worker or an approved scheduled/separate worker.
- No production system was accessed, so production security posture is not verified.
