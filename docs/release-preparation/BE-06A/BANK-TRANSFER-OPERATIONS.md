# Static Bank Transfer Operations

**Status: current manual workflow preserved; real bank/QR operations are BLOCKED_PENDING_OWNER.** No banking information was generated and no transfer was made.

## State boundary

- Student transfer report records `paymentSubmittedAt` on an existing PENDING order and queues an Admin notification. It does **not** mark the order PAID or grant enrollment.
- Only authenticated Admin approval transitions a submitted PENDING order to PAID, creates or extends the enrollment as appropriate, records adjustment/audit history, and queues Student notification.
- Approval requires that transfer submission was recorded. There is no bank API, payment gateway, webhook, or automatic reconciliation.

## Operator checklist for each staging payment

1. Confirm the account holder name and account number against owner-provided bank records using a second-person check.
2. Verify the static QR is hosted at the approved HTTPS location, scans correctly, and encodes the intended recipient/account. Compare the visible recipient before any transfer.
3. Match the bank reference/order code exactly and check the amount against the immutable order total and currency.
4. Verify the transaction is settled in the bank channel; a Student-submitted report is not proof of receipt.
5. Check for duplicate bank references, repeated screenshots, partial/overpaid transfers, delayed settlement, and transfers with no matching order.
6. For unmatched or delayed payments, leave the order pending and document evidence in the approved restricted operations record; do not grant access manually.
7. Before approval, re-open the order and confirm it is still PENDING, report exists, amount/reference match, and no duplicate transfer was previously applied.
8. Approve once through the Admin operation. Verify PAID, enrollment state/expiry, adjustment history, audit event, and notification outbox.
9. For cancellation, preserve evidence and reason. Confirm no paid transfer is being discarded; if funds arrived, escalate for manual reconciliation before cancellation.
10. For refunds, require external bank confirmation and owner-approved refund policy. The app does not issue refunds.
11. Reconcile unmatched, duplicate, delayed, cancelled, and refunded records daily during staging and have a second operator review.
12. Do not enter real bank details in source, environment templates, issue comments, or this runbook. Use only approved synthetic staging details.

Business owner must approve account details, QR image/source, matching evidence, escalation contacts, reconciliation cadence, and cancellation/refund policy before payment testing.
