# Security Review

## Enforced boundaries

- Student commerce operations are owner-scoped; a Student cannot cancel another user's Order or approve a payment.
- Only ADMIN routes can create/edit/deactivate renewal plans and coupons or mutate enrollment access.
- Prices, duration, discount selection, coupon reservation, expiry, and entitlement status are calculated or selected server-side; request schemas reject unexpected fields.
- Pending Orders do not grant learning access. REVOKED enrollment cannot be renewed directly; expired ACTIVE enrollment can view renewal plans.
- Coupon capacity is changed with conditional updates and transaction state checks, limiting use to `reserved + redeemed < usageLimit`.
- Admin order cancellation is rejected after PAID and requires a reason plus reconciliation attestation while PENDING.
- Audit/outbox records share Admin mutation transactions. No payment provider, webhook, refund execution, or payment-transaction collection was introduced.
- Public/Admin/student DTOs do not expose DB credentials, JWT/refresh tokens, password hashes, or media storage keys.

## Verification boundary

The integration suite runs against an isolated MongoDB replica set and exercises real transaction paths. `npm audit` and `npm audit --omit=dev` report dependency findings for the current lockfile. This does not establish production Atlas configuration, deployed access controls, SMTP delivery, or browser-level authorization behavior.
