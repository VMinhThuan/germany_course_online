# Phase 2D — Known limitations

- Amounts, term, coupon discount and renewal plan prices are hypothetical demo fixtures; product owners must approve official amounts and terms before publication.
- There is no payment provider, webhook, server signature, idempotency key or reconciliation ledger. The mock outcome button is only a development/demo action.
- Browser session storage is not a source of payment truth and can be cleared or edited by the user.
- Coupon applicability, stacking, expiry, usage limits, rounding policy, taxes, refunds, cancellation and invoices need approved backend/product rules.
- Order persistence and race protection must move to a transactional backend. Backend payment success must be the only authority that grants enrollment.
