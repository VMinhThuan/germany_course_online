# Renewal Plans and Pricing

## Renewal plan data

`renewal_plans` stores course, title, positive integer duration, Decimal128 price, `ACTIVE`/`INACTIVE` status, sort order, and timestamps. The price is independent of `courses.price`. Admin writes accept an exact whole-VND decimal string and reject zero-priced paid plans; plan deletion is a status change so existing Orders retain their reference and snapshots.

Admin operations are:

- `GET` and `POST /api/v1/admin/courses/:courseId/renewal-plans`
- `PATCH` and `DELETE /api/v1/admin/renewal-plans/:planId`

Mutations are course-scoped, validated, and audited. A price or duration edit affects only future checkout calculations.

## Student listing

`GET /api/v1/renewals/courses/:courseId/plans` returns active plans only when the student has an ACTIVE enrollment for that course. An ACTIVE enrollment remains eligible when its expiry timestamp is in the past. A missing enrollment or a REVOKED enrollment is rejected. Expiry remains timestamp-derived; the enrollment record has no persisted `EXPIRED` status.

## Money representation

VND values are stored as MongoDB Decimal128 and serialized as exact integer strings. Business arithmetic in `commerce/pricing.ts` uses `BigInt`; floating-point values are not used to choose a price. Coupon percentage and automatic 5% discounts use an isolated provisional half-up rounding rule to the nearest whole VND. See [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md).
