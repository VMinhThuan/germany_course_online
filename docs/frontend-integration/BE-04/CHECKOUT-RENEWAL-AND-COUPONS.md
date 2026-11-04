# Checkout, Renewal and Coupons

## Purchase sequence

`frontend/src/app/student-lms/commerce-pages.tsx` and `apiStudentRepository` call the quote and coupon APIs, create a `PENDING` order and display backend-provided transfer instructions. The student’s “I transferred” action records a transfer report only; the order stays PENDING. Admin must reconcile and approve separately before enrollment changes.

Client code does not calculate authoritative price, discount, coupon capacity, renewal expiry or entitlement. Integer VND decimal-string values are formatted for display only. Purchase/renewal orders carry server quote snapshots and idempotency keys where supported.

## Renewal and discounts

- Renewal options load from `/renewals/courses/:courseId/plans` after backend eligibility is checked.
- Renewal quote/order uses the selected plan and server-calculated price/expiry.
- Coupon validation is an API request; a coupon can be rejected for capacity, status, date or scope by the server.
- UI supports the backend automatic 5% discount from the second PAID PURCHASE onward and coupon interaction through the returned quote; it does not calculate the discount locally. PENDING purchases and RENEWAL orders do not qualify.
- Cancel actions use student/admin cancellation endpoints and backend reason/reconciliation contracts.

## Verification and scope

The E2E confirms a purchase quote, coupon acceptance, a PENDING order, transfer report remaining PENDING, Admin approval, and resulting learning entitlement. It does not yet exercise the complete renewal → transfer → Admin approval → expiry extension journey, coupon reservation release after cancellation, or every blocked cancellation edge case in the browser. Backend regressions cover business rules separately. See [BROWSER-E2E-TEST-RESULTS.md](BROWSER-E2E-TEST-RESULTS.md).
