# Checkout and Static QR Configuration

## Configuration

Admin operations manage the existing private `site_settings.payment` object. `PATCH /api/v1/admin/site-settings` accepts public fields already present in BE-00 and a partial payment object with a required `enabled` flag. When enabling transfers, the merged settings must contain a nonempty bank name, account number, account holder, transfer instructions, and an HTTPS QR URL without URL credentials.

The QR URL is an Admin-approved hosted static image reference. This phase does not upload an asset, generate QR codes, or seed banking data. It does not verify that the remote image is available or contains a payment amount/reference.

`GET /api/v1/admin/site-settings` includes bank details for an authenticated ADMIN. The public `/api/v1/site-settings/public` response does not include `payment`. A settings PATCH changes only fields supplied by the caller; unrelated settings remain intact. If the singleton is absent, PATCH initializes the public `siteName` to the established product name `PAniverseDeutsch` and leaves bank transfer disabled until a complete enabled configuration is supplied.

## Checkout behavior

- `GET /api/v1/checkout/quote` calculates a whole-VND standard PURCHASE quote from the published course's current Decimal128 price and access duration.
- No discounts are applied. `discountAmount` is exactly `"0"`.
- Zero-price courses fail with `ZERO_PRICE_UNSUPPORTED`.
- Unsupported renewals and coupon codes fail explicitly.
- `POST /api/v1/orders` checks payment configuration before inserting an order. Missing or disabled configuration returns HTTP 503 `PAYMENT_CONFIGURATION_UNAVAILABLE` and creates no order.
- The order snapshots the title, course price, base, discount, total, and duration. Course edits cannot alter a created order.
- The student sees the order code and amount separately from the static QR. The transfer instruction tells the student to include the exact order code in the bank transfer description.
- Order details return current enabled payment instructions only while the order is PENDING. Disabling payment settings hides them from checkout and prevents new order creation.

## Idempotency and conflict policy

`Idempotency-Key` accepts 8–128 characters. A same-key/same-fingerprint request returns the original order; a changed payload returns HTTP 409 `IDEMPOTENCY_KEY_REUSED`. The partial unique key index is per student. A second outstanding PENDING PURCHASE for the same student/course is blocked. Any existing enrollment row for the pair also blocks a new PURCHASE; this conservative rule awaits owner confirmation for expired/revoked access cases.
