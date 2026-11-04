# Commerce and Renewal Browser Validation

**Automated result: PASS for the listed synthetic journeys. Real banking acceptance: NOT RUN.**

## Purchase and discount behavior

- First purchase quote has no automatic discount. After a paid purchase, a second eligible purchase receives exactly 5% from the backend-calculated amount; pending and renewal orders do not qualify.
- Browser assertions compare displayed VND amounts with quote/order responses. React does not choose the authoritative discount.
- The suite exercises a valid percent coupon, fixed coupon, expired/inactive/limited coupon, an automatic discount larger than a coupon, a coupon larger than automatic discount, and an equal-discount tie. Only the winning discount is selected.
- A pending order reserves coupon capacity; cancellation releases it, and a later eligible order can reserve it. Approval records redemption.

## Transfer, approval and cancellation

- Creating an order leaves it `PENDING`. The learner's transfer report keeps it pending and removes the student cancel action. Protected lesson access is denied until Admin approval grants enrollment.
- Repeated student cancellation is safe. Cancellation after transfer report is rejected, and a paid order cannot use the pending-cancel path.
- Admin cancellation requires a reason and a reconciliation outcome. The test uses `NO_FUNDS_RECEIVED` only against synthetic in-memory data; no bank transfer or refund occurred.
- Order/enrollment state is confirmed through authorized HTTP calls and the Admin browser, not by a visual mock.

## Renewal

- Renewal-plan pricing is read from the backend. Active and expired active enrollments can renew; a revoked enrollment cannot renew directly.
- Approval extends the existing enrollment, keeps its identifier, and preserves progress/Quiz history. The updated expiry is observed after refetch.
- Month-end and leap-year UTC calendar arithmetic is covered by the backend commerce integration test.

No automatic pending-order expiry or real payment gateway is claimed. The bank detail shown by E2E is a synthetic placeholder; follow [PAYMENT-OPERATIONS-CHECKLIST.md](PAYMENT-OPERATIONS-CHECKLIST.md) before any staging payment acceptance.
