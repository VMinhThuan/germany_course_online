# BE-03B Handoff

BE-03A ends at the standard PURCHASE and manual bank-transfer approval boundary. Preserve this work and its local uncommitted state. Do not infer additional features from the BE-03A handoff.

## Available backend behavior

- Ten commerce operations are mounted in Express and documented in the synchronized OpenAPI contract.
- Orders are PENDING until Admin approval. Approval atomically grants an enrollment, records a GRANT adjustment and audit entry, and queues the Student email.
- Existing BE-02 entitlement APIs recognize the grant after commit.
- Admin bank-payment settings are private and unseeded; SMTP uses the BE-01 email-service boundary and durable Mongo outbox.

## Decisions still needed

1. Define whether revoked/expired enrollments can be repurchased, restored, or renewed, and how progress is preserved.
2. Define pending-order expiry, cancellation, Admin rejection, and what happens when a bank transfer cannot be matched.
3. Approve real bank data and a stable hosted QR source, and verify the image content/account ownership before enabling payments.
4. Approve SMTP provider/secrets and choose persistent worker hosting or scheduled/separate worker delivery.
5. Approve renewal plan prices and renewal expiry policy before implementing paid renewals.
6. Finalize coupon eligibility, stacking, usage reservation, and release rules before redemption.
7. Continue BE-02 decisions for quiz completion/review and configure/test an approved S3-compatible media provider.

## Operational steps after owner decisions

- Configure bank settings through an authenticated Admin operation; do not seed them from code.
- Configure production SMTP and a persistent worker runtime.
- Use the BE-06A runbook for a staging-only index review/apply. Production index changes require a separate future authorization and migration process.
- Run full regression, security review, and target-runtime verification before any separately authorized deployment.

No BE-03B work, frontend integration, deployment, commit, or push was performed in this phase.
