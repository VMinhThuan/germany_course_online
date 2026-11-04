# Known Limitations

- No production Atlas connection, schema migration, or live index creation was performed. The schema catalog and index declarations are design/runtime evidence only.
- Real SMTP delivery and persistent email-worker hosting are not configured; integration coverage uses a fake email provider.
- Bank transfer settings remain operator-managed and fail closed when absent. No bank reconciliation automation, payment gateway, webhook, or refund execution exists.
- Pending orders and coupon reservations intentionally have no automatic expiry and can occupy limited capacity indefinitely. Admins must review outstanding reservations and resolve Orders manually.
- A coupon that reduces an estimated total to zero can be quoted, but Order creation rejects zero-total payment because no free-enrollment policy has been approved.
- Whole-VND percentage discount rounding is explicitly provisional half-up rounding. Confirm the accounting rule before changing or promising fractional pricing behavior.
- Admin coupon listing bounds outstanding reservation summaries to 100 records in a page-level lookup. Large backlogs require pagination and direct Order review.
- The backend-only phase does not update frontend API consumers or deliver browser E2E evidence. Deployment and runtime production behavior remain unverified.
