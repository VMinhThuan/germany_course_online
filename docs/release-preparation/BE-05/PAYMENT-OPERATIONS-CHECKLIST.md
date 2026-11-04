# Manual Payment Operations Checklist

The current flow uses a configured static QR and manual bank transfer instructions. Student confirmation means **“reported transfer” only**; it is not evidence that funds arrived. E2E uses a synthetic bank name, account number, holder, QR URL and test orders. No real transfer was initiated.

Before accepting staging payments, an authorized owner/operator must:

1. Verify the legal account owner and bank account number through an independent channel.
2. Generate and scan the static QR; check the encoded bank/account/amount/reference semantics and hosted image availability.
3. Confirm transfer-reference instructions, including the unique order code and amount matching rules.
4. Define who reviews bank statements, what evidence is retained, and how matching is recorded before Admin approval.
5. Test a matching transfer, an unmatched reference, wrong amount, duplicate report and delayed transfer with approved non-customer funds or a safe bank test environment.
6. Require Admin to record reconciliation reason/outcome before cancelling a transfer-reported order. Confirm that “no funds received” and “funds received” produce the intended workflow.
7. Define support and escalation for reversals, duplicate transfers and refunds. The LMS does not execute a bank refund.
8. Ensure a report click alone never marks the order PAID or grants access; only the authorized reconciliation/approval workflow does.

Do not enter live account data into the repository, fixture server or these documents. Configure staging bank details only after owner approval.
