# Open Decisions and Risks

These items are deliberately not represented as confirmed business rules. They do not all block BE-01; the milestone column identifies when a decision becomes necessary.

| ID | Open item | Risk if assumed | Recommended owner decision / milestone |
|---|---|---|---|
| O-01 | Renewal plan price is absent from PDF but required by renewal checkout/frontend `RenewalPlanViewModel.priceVnd` | Cannot quote or create correct renewal order | Approve `renewal_plans.price` as VND Decimal128 and Admin-editable; before BE-03 |
| O-02 | Renewal calendar edge behavior, timezone and expiry anchor | Different date users see at month-end/leap year | Approve UTC `max(now,expiresAt)` + day clamp recommendation; before BE-03 |
| O-03 | 5% second-purchase discount eligibility, per-user/per-course, renewal inclusion, duration, coupon stacking | Incorrect charges/entitlement to discount | Keep disabled; define before enabling discount in BE-03 |
| O-04 | Admin session policy vs PDF Student-only single session | Accidental forced logout or weakened admin security | Keep Student rule only; approve multi-session or single-session Admin policy before auth release |
| O-05 | Lesson `content` structure and exact quiz status/questionType/score field enums | Content cannot be validated consistently | Define versioned lesson block DTO and confirm source enums before BE-02 |
| O-06 | Does quiz completion require passing `passScorePercent`, or any submitted attempt? | Lesson completion can be too strict/lenient | Confirm against PDF business interpretation before BE-02; do not infer from field name |
| O-07 | Post-submit answer review policy vs `showCorrectAnswers` | Correct answers may be over/under exposed after submit | Define who sees correct option/explanation and whether setting can suppress review before BE-02 |
| O-08 | `renewal_plans.status` and `coupons.status` exact enum values are not clear in schema extraction | Active/inactive behavior mismatch | Confirm allowed literals from product/admin requirements before schema freeze |
| O-09 | Admin manual enrollment grant/adjustment permissions and reason policy | Unauthorized course access | Default no manual grant endpoint; decide before Admin enrollment UI |
| O-10 | Whether coupon usage limit counts created PENDING orders, and when cancelled/expired order releases a slot | Lost/oversubscribed coupon capacity | Define reservation expiry/release flow before BE-03 |
| O-11 | Coupon per-user cap, user/course restrictions, stacking and zero/negative total behavior | Miscalculated promotions | Keep unspecified restrictions off; confirm before commerce build |
| O-12 | Public intro video and generic preview schema/asset association | Public media may expose paid content or existing preview breaks | Add explicit course-to-public-intro association and visibility policy; no A1.1 special case. Confirm before frontend integration |
| O-13 | S3-compatible provider, object privacy, upload limits, signed URL TTL, content-type allowlist | Upload/access may be insecure or implementation incompatible | Select provider and set limits before BE-02 media work |
| O-14 | Bank account, QR, account holder, and transfer instructions | Checkout cannot accept real transfers | Configure verified values in deployment/Admin only; never use fabricated data; before BE-03 |
| O-15 | SMTP provider, sender, retry limit/backoff, retention | Notices/reminders can silently fail or spam | Configure real provider/operations in BE-03; do not make SMTP success transactional |
| O-16 | Access/refresh token TTL, allowed origins, cookie domain, CSRF token design | Session/security behavior can diverge by deploy topology | Choose from deployment hostnames before BE-01 production config |
| O-17 | Phone/email verification and account-blocking policy | Users may access accounts without intended checks | PDF fields exist but lifecycle is unspecified; decide before auth release |
| O-18 | Retention/privacy policy for IP, user agent, login events, audit, email logs, notes | Personal data retained indefinitely | Define retention and deletion obligations before public launch |
| O-19 | Enrollment behavior when course is archived/soft-deleted and on expired/revoked status | Paid learners may lose or retain access unexpectedly | Define owner support policy before CMS release |
| O-20 | 24/7 email reminder timing/window and duplicate suppression for timezone | “7 days before” may send early/late or duplicate | Recommendation: once at seven UTC days before current expiry; approve before scheduler |
| O-21 | Course publication completeness criteria and whether empty course/sections can publish | Empty/draft content may become visible | Proposed validation gate only; Admin policy required before CMS |
| O-22 | Deployment target/runtime and DB transaction concerns | Long-running worker may not fit serverless execution | Use one always-on Node service initially or separately scheduled worker if hosting requires; choose before BE-01/03 |
| O-23 | Frontend session list expects `lastActiveAt`, absent from the PDF session fields | UI may imply a precise activity timestamp the backend does not store | Project existing `updatedAt` as an approximate display value or approve a separate activity timestamp; decide before account adapter |

## Decision register discipline

Implementation must keep the labels in the design: confirmed owner/spec inputs become tests; recommendations remain visibly configurable or blocked behind a decision; open items must not be hardcoded into seed data. Newly supplied decisions should update the API/schema mapping before BE-03 if they change order or entitlement writes.
