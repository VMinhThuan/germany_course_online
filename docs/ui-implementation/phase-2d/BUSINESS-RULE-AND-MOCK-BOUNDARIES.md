# Phase 2D — Business rules and mock boundaries

- `OrderType`: `PURCHASE | RENEWAL`. `OrderStatus`: `PENDING | PAID | FAILED | CANCELLED | EXPIRED`. `PaymentStatus`: `PENDING | SUCCESS | FAILED`.
- Creating an order makes it `PENDING`; `PENDING` never grants enrollment. Only the explicit demo gateway success transition returns an active enrollment. Failed payment never grants access.
- A terminal order cannot be transitioned a second time by the mock gateway. Order and payment statuses must agree before success/failure is applied.
- `DEMO10` is an illustrative 10% coupon. Invalid codes return an explicit error and do not alter the quote.
- Purchase price 1,290,000 VND / 12 months and renewal plans 100,000 / 250,000 / 800,000 VND for 1 / 3 / 12 months are hypothetical, not approved tuition or terms.
- Renewal after active access extends from current expiry; expired access starts at the mock `paidAt`. Month addition is calendar-based and clamps end-of-month dates.
- Coupon and price values are not a real offer. No card, bank, QR, gateway or refund terms are represented.
