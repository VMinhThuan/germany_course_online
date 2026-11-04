# Business Rule Matrix

| ID | Rule | Authority | Enforcement | Failure/result |
|---|---|---|---|---|
| CAT-01 | Only `PUBLISHED`, nondeleted course/section/lesson/exercise content is exposed publicly | PDF + REC | Catalog query/service filters every hierarchy level | Hidden/draft appears as not found publicly |
| CAT-02 | Admin owns course, section, lesson, exercise, quiz and media metadata | PDF | ADMIN guard + Zod DTO + audit log | 403 or field validation error |
| CAT-03 | A1.1 has no special preview rule or hardcoded section/lesson IDs | Owner | No A1.1 middleware/field/index | Preview mock must be replaced/adapted |
| AUTH-01 | User roles are STUDENT and ADMIN; registration creates STUDENT only | PDF + security REC | Server-assigned role | Caller cannot elevate role |
| AUTH-02 | New Student login revokes its previous active session | PDF | Mongo transaction + unique Student active-session index candidate | Concurrent login retries/rejects stale session |
| AUTH-03 | Every protected request validates the session referenced by JWT `sid` | PDF | Auth middleware checks ownership/status/expiry | `SESSION_REVOKED` or `UNAUTHORIZED` |
| LEARN-01 | Paid content requires authenticated valid active enrollment | PDF | Entitlement service checks status and `expiresAt` | 403/404 without exposing content |
| MEDIA-01 | Media requires a matching lesson/exercise association and same course ancestry | PDF | Media service joins metadata/association/parents | 404 or 403; no URL on mismatch |
| MEDIA-02 | Enrolled learners may read answer PDF/video before completing exercise | Owner override | Entitlement and exact association only; ignore completion state | No completion mutation as side effect |
| QUIZ-01 | Single-choice quiz; only server grades | PDF + owner | Zod enforces one selected option per question; service compares to stored key | Invalid option rejected; client score ignored |
| QUIZ-02 | Correct option is never returned in quiz/attempt before submit | PDF + owner | Explicit attempt DTO projection; integration test required BE-02 | No `isCorrect`/correctOptionId leaks |
| QUIZ-03 | Retry creates a new attempt and preserves earlier submitted result | PDF | Insert new attempt linked to quiz/user | Existing result remains immutable |
| PROG-01 | Required exercises determine whether lesson can complete | PDF | Progress service recomputes from lesson's currently published required exercises and student records | Client cannot force `COMPLETED` |
| PROG-02 | Backend calculates course completion/percent from eligible lessons | PDF | Aggregation/service; return numerator/denominator | Ignore client-supplied percent |
| ENR-01 | PENDING order does not grant course access | Owner | Entitlement checks enrollment, not order status | No access until approval transaction commits |
| ORD-01 | Create order from current server-side course/plan price; snapshot commercial values | Owner | Order service and Decimal128 money helper | Reject unavailable/DRAFT course or invalid plan |
| ORD-02 | Repeated `I transferred` submission leaves PENDING and schedules one admin notice | Owner | Set/retain `paymentSubmittedAt`; dedupe outbox key | Idempotent success response |
| ORD-03 | Only Admin approves; requires PENDING + transfer submitted | Owner | Compare-and-set update inside Mongo transaction | Second/concurrent approval returns conflict/already-paid DTO; no second grant |
| ORD-04 | Approval marks PAID, timestamps reviewer, creates/extends enrollment and adjustment, audit and student notice atomically | Owner | One Mongo transaction; SMTP happens after commit | Transaction abort means no partial grant; email failure does not undo payment state |
| ORD-05 | No Admin reject/payment failure flow in V1; other PDF enum values remain reserved | Owner | Route/service deliberately absent | No synthetic FAILED/CANCELLED transition |
| COUPON-01 | Validate and calculate coupon on server at quote and order creation | PDF + REC | Normalized code/status/date/usage checks, exact decimal arithmetic | Invalid/expired/exhausted code returns typed invalid response |
| COUPON-02 | Usage cap must be atomic under concurrent order creation | REC | Conditional counter increment plus order/redemption insert in same transaction | One request wins last slot; others conflict |
| RENEW-01 | Renewal retains prior learning progress and extends existing entitlement | PDF | Update one enrollment; add one adjustment for paid order | No duplicate entitlement or progress reset |
| EMAIL-01 | 7-day reminder and payment notices are durable/idempotent | PDF + REC | Outbox row inserted transactionally; worker leases/retries | SMTP outage does not roll back domain mutation |
| ADMIN-01 | Admin edit/approval actions produce redacted audit records | PDF + REC | Audit insert in same transaction for critical writes | No audit record with password/token/bank secrets |

## Publication and deletion

Public course listing filters `courses.status=PUBLISHED` and `deletedAt:null`. Detail/outline also filter sections/lessons/exercises with their publish state and nondeleted state; a published child under a draft/hidden parent is never public. Preview access is not encoded as A1.1-specific structure. Course retirement should use `ARCHIVED` or soft delete according to owner intent; deleting a parent must not cascade-delete order, enrollment, progress, or audit history. Exact behavior when a purchased course is archived/deleted is an open Admin policy.

## Money/coupon invariants

Use Decimal128 and decimal-safe arithmetic; reject negative course/plan prices, discount, and total. Order total is computed server-side as base price minus eligible discount, clamped at zero only if the product confirms that behavior; until then, discount greater than subtotal is rejected. VND wire strings have no exponent and no fractional digits. Historical orders use stored snapshots; later price/course edits never recalculate them.

## UI state derivation

`PENDING + paymentSubmittedAt=null` means transfer not reported; `PENDING + paymentSubmittedAt!=null` means awaiting Admin review; `PAID` means approved. Do not persist or expose `AWAITING_REVIEW` as an order enum. A valid enrollment is independent of whether the checkout UI has refreshed its order query.
