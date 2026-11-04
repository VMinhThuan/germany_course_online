# Relationships and Indexes

## Relationship rules

1. **Catalog ancestry:** `course_sections.courseId → courses._id`; `lessons.sectionId → course_sections._id`; `exercises.lessonId → lessons._id`. Every admin write and student read verifies the complete ancestry and same course, not just that each ObjectId exists.
2. **Media:** `lesson_assets` and `exercise_assets` are association documents. Before issuing a protected URL, verify association row, asset, exercise/lesson ancestry, publication where relevant, and the learner's active unexpired enrollment. Solution roles do not require exercise completion.
3. **Quiz:** one bounded quiz document per exercise contains questions/options. Attempt points and answer/result snapshots are frozen independently. Quiz result reads verify `attempt.userId === current user` unless Admin support access is explicitly authorized.
4. **Progress:** unique user/resource pairs make writes upserts. Completion is server-derived, not a client-submitted percent.
5. **Entitlement:** one enrollment per `(userId,courseId)` is the proposed lifecycle aggregate. Renewal extends the same record; adjustment entries preserve history. Existing lesson/exercise/quiz progress is never reset on renewal.
6. **Commerce:** order owns commercial snapshots. `sourceOrderId` identifies initial grant; each paid renewal has one unique adjustment by order. Coupon redemptions reference the applied order and preserve charged discount.
7. **Platform:** `email_logs.dedupeKey` prevents duplicate notices; `audit_logs` are append-only. Singleton `site_settings` has one canonical record.

## Index plan

Indexes below are proposals to support identified access patterns. Confirm collection cardinality and query plans before adding optional indexes in BE-01. Existing duplicates must be resolved before unique index creation.

| Collection | Index | Why / notes |
|---|---|---|
| `users` | unique `{email:1}` | Case-normalized login and duplicate registration protection |
| `user_sessions` | `{userId:1,status:1,expiresAt:-1}` | Active-session lookup and revocation |
| `user_sessions` | partial unique `{userId:1}` where `status:'ACTIVE',roleAtIssue:'STUDENT'` | Enforce one active Student session; depends on approved `roleAtIssue` extension |
| `user_sessions` | `{refreshTokenHash:1}` unique | Opaque refresh lookup; hash is not secret plaintext |
| `user_sessions` | TTL `{expiresAt:1}` with `expireAfterSeconds:0` optional | Eventual cleanup only; middleware checks expiry/status synchronously |
| `login_events` | `{userId:1,createdAt:-1}`; `{ipAddress:1,createdAt:-1}` | Account/IP investigation; retention must be decided |
| `password_reset_tokens` | unique `{tokenHash:1}`; `{userId:1,expiresAt:1}` | One-time token lookup/cleanup |
| `courses` | unique `{slug:1}`; unique `{code:1}` | Public slug and stable code |
| `courses` | `{status:1,deletedAt:1,sortOrder:1,_id:1}` | Public listing/publish order |
| `course_sections` | `{courseId:1,status:1,deletedAt:1,sortOrder:1,_id:1}` | Course outline and ordered CMS |
| `lessons` | `{sectionId:1,status:1,deletedAt:1,sortOrder:1,_id:1}` | Section outline/workspace |
| `exercises` | `{lessonId:1,status:1,deletedAt:1,sortOrder:1,_id:1}` | Lesson exercise list |
| `media_assets` | `{provider:1,storageKey:1}` unique | Prevent duplicate canonical object keys |
| `lesson_assets` | unique `{lessonId:1,assetId:1,assetRole:1}`; `{lessonId:1,sortOrder:1}` | Association integrity and ordered lesson assets |
| `exercise_assets` | unique `{exerciseId:1,assetId:1,assetRole:1}`; `{exerciseId:1,sortOrder:1}` | Exact scoped access and ordered assets |
| `quizzes` | unique `{exerciseId:1}` | One quiz per quiz exercise; confirm if multiple quizzes become a requirement |
| `quiz_attempts` | `{userId:1,quizId:1,startedAt:-1}`; `{exerciseId:1,userId:1,submittedAt:-1}` | Attempt history and latest outcome |
| `lesson_progress` | unique `{userId:1,lessonId:1}`; `{userId:1,status:1}` | Upsert and dashboard/course rollup |
| `exercise_progress` | unique `{userId:1,exerciseId:1}`; `{userId:1,status:1}` | Eligibility calculation and learner list |
| `lesson_notes` | unique `{userId:1,lessonId:1}` | One note per learner/lesson |
| `enrollments` | unique `{userId:1,courseId:1}`; `{userId:1,status:1,expiresAt:1}`; `{courseId:1,status:1,expiresAt:1}` | Entitlement, student list, reminder scan |
| `enrollment_adjustments` | `{enrollmentId:1,createdAt:-1}`; unique partial `{orderId:1,adjustmentType:1}` where orderId exists | Timeline and exactly-once paid order effect |
| `renewal_plans` | `{courseId:1,status:1,sortOrder:1}` | Active plan list |
| `orders` | unique `{orderCode:1}`; `{userId:1,createdAt:-1}`; `{status:1,paymentSubmittedAt:1,createdAt:1}`; `{courseId:1,userId:1,createdAt:-1}` | Lookup, history, Admin pending queue, discount audit |
| `orders` | unique partial `{userId:1,idempotencyKey:1}` where key exists | Optional POST replay safety; requires REC field |
| `coupons` | unique `{code:1}` | Normalized code lookup |
| `coupon_redemptions` | unique `{orderId:1}`; `{couponId:1,createdAt:-1}`; `{userId:1,createdAt:-1}` | One coupon result/order and audit/listing |
| `email_logs` | unique `{dedupeKey:1}`; `{status:1,availableAt:1,leaseExpiresAt:1}`; `{userId:1,createdAt:-1}` | Outbox claim, idempotency, support lookup |
| `audit_logs` | `{entityType:1,entityId:1,createdAt:-1}`; `{actorUserId:1,createdAt:-1}` | Entity timeline and actor trail |

## Atomicity notes

- Enforce student single session through transaction plus partial unique index (the extension must be approved); transaction retries handle contention.
- Prevent duplicate payment effects with compare-and-set order update and unique partial adjustment index in the same transaction.
- Coupon usage limits need a conditional atomic counter update in the order transaction; a plain `countDocuments()` check can oversubscribe under concurrency.
- Email dedupe uses unique key insertion in the business transaction; the worker claims with an atomic lease update.
- TTL indexes are cleanup aids only. Never rely on TTL timing to authorize sessions or determine token validity.
