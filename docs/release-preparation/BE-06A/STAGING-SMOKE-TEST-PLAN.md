# BE-06B Staging Smoke-Test Plan

**Status: PREPARED_ONLY for deployed staging.** Use only owner-approved synthetic accounts/orders/media and an approved test mailbox/bank/QR. Do not use customer data or real funds. Local BE-04/BE-05 suites are separate evidence and do not mark these staging cases passed.

|   # | Check                                      | Expected evidence                                                                            |
| --: | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
|   1 | Frontend initial load over HTTPS           | Valid certificate, SPA entry and assets load.                                                |
|   2 | Backend `GET /health` and `/ready`         | Liveness 200; readiness 200 with DB, 503 when safely simulated unavailable.                  |
|   3 | Register and Student login                 | Student account, access token, HttpOnly Secure refresh cookie.                               |
|   4 | Refresh and logout                         | CSRF/origin accepted, refresh rotates, logout revokes and clears cookie.                     |
|   5 | New Student login revokes previous session | Old session/token can no longer refresh.                                                     |
|   6 | Initial Admin login                        | Approved bootstrapped Admin can sign in; role-protected route succeeds.                      |
|   7 | Published catalog                          | Only intended published courses and safe fields appear.                                      |
|   8 | Create a PENDING order                     | Snapshot amount/course/duration are correct; no enrollment yet.                              |
|   9 | Report bank transfer                       | Submission remains PENDING and only queues Admin notification.                               |
|  10 | Admin approves synthetic order             | PAID transition, audit/adjustment, enrollment and outbox record appear atomically.           |
|  11 | Lesson access                              | Entitled Student reads lesson/media; unentitled Student is denied.                           |
|  12 | Quiz submission/progress                   | Answers, score and progress persist; idempotency/retry behavior is correct.                  |
|  13 | Coupon and renewal                         | Approved policy/prices, reservation/redemption, renewal expiry and entitlement verified.     |
|  14 | Admin course CMS                           | Create/edit/publish/reorder and public catalog projection verified.                          |
|  15 | Admin enrollment operations                | Grant/extend/revoke/restore audit and expiry behavior verified.                              |
|  16 | Media upload/playback                      | Signed PUT, CORS, HEAD validation, private signed GET, playback/PDF and deletion verified.   |
|  17 | SMTP delivery                              | Approved test mailbox receives reset/Admin/Student mail with valid links and no duplicates.  |
|  18 | Worker retry/dedupe                        | Forced test failure, backoff, lease reclaim, terminal FAILED alert and dedupe verified.      |
|  19 | Backup/restore                             | Named checkpoint restored to isolated DB; counts/transactions/indexes verified.              |
|  20 | Logs/monitoring                            | Request IDs, redaction, latency/errors, DB, outbox, storage, audit and host alerts verified. |
|  21 | Rollback rehearsal                         | Previous artifact pair restored; database recovery decision and owner approval recorded.     |

For every case capture environment/source SHA, UTC time, operator, synthetic IDs, expected/actual, sanitized evidence, status, and follow-up. Mark `PASS` only after deployed execution; provider work and all 21 staging cases are **NOT_RUN** in BE-06A.
