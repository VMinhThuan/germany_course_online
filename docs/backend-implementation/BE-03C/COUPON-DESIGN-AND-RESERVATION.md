# Coupon Design and Reservation

## Models and eligibility

BE-03C extends the existing `coupons` and `coupon_redemptions` collections. Coupons support normalized uppercase codes, `PERCENT` and whole-VND `FIXED` discounts, optional maximum discount, optional usage limit and date window, and `ACTIVE`/`INACTIVE` state. No user-specific cap, course restriction, stacking, or personalized tier is introduced.

Coupon validation at `POST /api/v1/coupons/validate` is read-only and exposes only the potential/selected discount and estimated payable amount. It does not return usage counters or reserve capacity. Order creation revalidates the coupon inside the transaction.

## Capacity invariant

Available usage is bounded by `reservedCount + redemptionCount`. If the coupon wins discount selection, one slot is reserved with a conditional atomic coupon update, a `RESERVED` redemption is created, and the pending Order is inserted in the same transaction. The unique redemption `orderId` index permits at most one coupon per Order. Competing requests for the last slot cannot both commit.

Approval transitions `RESERVED` to `REDEEMED`, decreases `reservedCount`, and increases `redemptionCount`. Cancellation transitions `RESERVED` to `RELEASED` and decreases `reservedCount`. Both state and counter changes share the Order transaction and are guarded by status conditions. Historical redemption rows are retained.

If the automatic discount is greater than or equal to the coupon discount, the automatic discount is selected and no coupon slot is reserved. A pending Order can hold a reservation indefinitely: no TTL, background cleanup, or automatic order expiration is present. Admin coupon listings include bounded outstanding pending-order summaries, and Admin order detail shows the reservation lifecycle.
