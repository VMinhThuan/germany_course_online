# BE-03C Handoff

BE-03B is complete at the Admin CMS, account-security, and read-only enrollment boundary. Preserve its local uncommitted state. Do not infer product policy from this handoff.

## Owner decisions needed before BE-03C writes

1. **Enrollment lifecycle:** Can expired or revoked enrollments be repurchased, restored or renewed? How are access expiry and existing progress handled?
2. **Renewals:** Which renewal plans/prices are offered, and when is new access expiry calculated?
3. **Pending orders and transfer review:** Define pending-order expiry/cancellation, unmatched bank transfers, rejection rules, evidence retention and Student notifications.
4. **Coupons/discounts:** Decide eligibility, stacking, usage limits/reservation, failure release and whether the automatic second-purchase discount is still desired.
5. **Admin enrollment changes:** Approve whether an Admin may grant, revoke or restore access, with required reason, audit and notification behavior.
6. **Quiz completion:** Decide whether a required quiz completes on submission, passing score, or manual review; define retry/failure and review rules. BE-03B intentionally blocks publication in the meantime.
7. **Operational providers:** Approve/configure the S3-compatible bucket and access policy; separately approve SMTP/runtime for durable mail delivery. Keep secrets outside source control.

## Existing behavior to preserve

- Standard PURCHASE/manual bank-transfer approval is implemented by BE-03A; do not silently add payment rejection/cancellation or a new payment collection.
- BE-02 quiz attempts preserve grading snapshots. Do not mutate old attempts when adopting an approved completion rule.
- BE-03B enrollment endpoints are read-only. Add mutation paths only after decision 5.

After decisions: update the domain contract first, then implement the narrow approved flow with transaction, audit, idempotency, tests, and synchronized OpenAPI. No BE-03C work was performed in this phase.
