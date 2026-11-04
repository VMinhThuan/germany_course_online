# Automatic Second-Purchase Discount

For a new PURCHASE quote or Order, the backend counts the student's earlier `PAID` `PURCHASE` Orders. At least one earlier paid purchase enables a 5% discount on the new course price. The first purchase, pending purchases, failed/cancelled/expired orders, and renewal orders do not qualify.

Coupon and automatic discounts are calculated independently from the same base amount. Only the larger one is used. An equal discount selects `AUTOMATIC_5_PERCENT`; therefore a tied coupon is neither attached to the Order nor reserved. The checkout quote exposes both potential discount amounts and `discountSource`; order creation repeats the calculation transactionally and snapshots only the selected result.

The tie-breaker is a technical recommendation recorded in the source and contract: it avoids consuming limited coupon capacity when the student receives no additional savings. Automatic percentage rounding is isolated in `commerce/pricing.ts` and uses the same provisional half-up whole-VND rule as percentage coupons.
