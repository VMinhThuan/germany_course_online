# Mongoose Schema Specification

## Notation

- **PDF** = field explicitly shown in the source table. **OWNER** = confirmed later by the owner. **REC** = technical extension proposed here. **OPEN** = name is present, but the field contract is not specified.
- `ObjectId → collection` is a reference. `?` means optional; `| null` means explicitly nullable. Defaults are recommendations where the PDF is silent. All IDs serialize as hex strings. Dates are UTC BSON `Date` and API ISO-8601.
- The PDF does not consistently declare Mongo requiredness, nullability, or defaults. The required/null/default flags below are implementation validation recommendations unless explicitly confirmed by the owner; field presence and a PDF enum do not by themselves confirm those constraints.
- Use `strict: 'throw'`, explicit schema allowlists, `runValidators: true`, and explicit public/student/admin serializers. Mongoose validation is defense in depth; request validation remains Zod.
- `timestamps: true` only where both `createdAt` and `updatedAt` are part of the contract. Where PDF has only one timestamp, preserve it explicitly.

## Authentication

### `users` — collection `users`

| Field | Type / contract | Origin and access |
|---|---|---|
| `_id` | ObjectId | Mongo-generated |
| `fullName` | string, required, trimmed, 1–120 chars | PDF; user/admin writable |
| `email` | string, required, normalized lowercase, validated | PDF; unique; login identifier |
| `passwordHash` | string, required, Argon2id encoded hash | PDF; private; never serialize |
| `phone` | string or null | PDF; optional; private profile field |
| `avatarAssetId` | ObjectId → `media_assets` or null | PDF; optional |
| `role` | `STUDENT | ADMIN`, required | PDF; only trusted admin/bootstrap path can assign ADMIN |
| `status` | `ACTIVE | BLOCKED`, required, default `ACTIVE` | PDF; Admin may block |
| `emailVerifiedAt` | Date or null | PDF; optional |
| `createdAt`, `updatedAt` | Date, required; `timestamps:true` | PDF |

No user soft-delete field is specified. Email normalization and unique index are required before insert. Public DTO never contains `_id` as BSON, password hash, session internals, or verification token.

### `user_sessions` — collection `user_sessions`

| Field | Type / contract | Origin and access |
|---|---|---|
| `_id` | ObjectId | Mongo-generated |
| `userId` | ObjectId → `users`, required | PDF |
| `refreshTokenHash` | string, required, one-way hash | PDF; secret; only auth service |
| `deviceId`, `deviceName`, `userAgent`, `ipAddress` | string or null | PDF; personal/device metadata; never returned wholesale |
| `status` | `ACTIVE | REVOKED | EXPIRED`, required | PDF |
| `expiresAt` | Date, required | PDF; TTL cleanup is optional and delayed, not authorization |
| `revokedAt` | Date or null | PDF |
| `revokeReason` | string/enum or null | PDF field; enum values are unspecified, proposed controlled codes in app |
| `roleAtIssue` | `STUDENT | ADMIN` | REC; permits Student-only partial unique active-session index |
| `createdAt`, `updatedAt` | Date | PDF |

The `roleAtIssue` extension avoids silently enforcing the Student-only session rule on admins. Add `roleAtIssue` to the OpenAPI/model only after owner accepts this technical field; alternative is a separately confirmed all-role policy. Token refresh updates the hash on the same session, never stores the raw token.

### `login_events` — collection `login_events` (PDF named only)

Proposed minimum fields: `_id:ObjectId`, `userId:ObjectId|null → users`, `outcome:SUCCESS|FAILURE`, `reasonCode:string`, `ipAddress:string|null`, `userAgent:string|null`, `createdAt:Date`. **All fields and outcome/reason enums are REC**, not PDF requirements. Avoid retaining submitted passwords or reset/refresh tokens. Define retention and whether unknown emails are recorded before implementation.

### `password_reset_tokens` — collection `password_reset_tokens` (PDF named only)

Proposed fields: `_id`, `userId:ObjectId → users`, `tokenHash:string`, `expiresAt:Date`, `consumedAt:Date|null`, `createdAt:Date`. **REC**. Store no raw token; return indistinguishable success from forgot-password for known/unknown email; one-time consume atomically.

## Catalog and content

### `courses`

PDF fields: `code:string`, `title:string`, `slug:string`, `description:string`, `shortDescription:string`, `objectives:string[]`, `requirements:string[]`, `level:string`, `thumbnailAssetId:ObjectId|null → media_assets`, `bannerAssetId:ObjectId|null → media_assets`, `accessDurationMonths:int`, `status:DRAFT|PUBLISHED|ARCHIVED`, `sortOrder:int`, `createdAt`, `updatedAt`, `deletedAt:Date|null`. Add required `price:Decimal128` in VND (**OWNER**). Add optional `introVideoAssetId:ObjectId|null → media_assets` (**REC**, pending confirmation) to represent a public course introduction without unlocking lesson preview content. `price >= 0`; `code`, normalized `slug` unique. New course defaults `DRAFT`, `deletedAt:null` (**REC**); publishing requires valid title/slug/price/duration and at least one publishable section (**REC; publish gate open for owner**). `deletedAt` is only a soft-delete marker; don't erase history. Public serializer includes only published/nondeleted content and decimal-string price.

### `course_sections`

PDF: `courseId:ObjectId → courses`, `title`, `description?`, `sectionType:CHAPTER|EXAM_PREP`, `sortOrder:int`, `status:DRAFT|PUBLISHED|HIDDEN`, `createdAt`, `updatedAt`, `deletedAt:Date|null`. New section defaults DRAFT and `deletedAt:null` (**REC**). Validate same-course parent, nonnegative integer sort, nonempty title. Unique ordering is not guaranteed by index; use `(courseId,sortOrder,_id)` deterministic sort and Admin service reorder transaction if required.

### `lessons`

PDF: `sectionId:ObjectId → course_sections`, `title`, `description?`, `content:Mixed/JSON`, `lessonType:LECTURE|PRACTICE`, `estimatedMinutes:int|null`, `countsTowardProgress:boolean`, `sortOrder:int`, `status:DRAFT|PUBLISHED|HIDDEN`, `createdAt`, `updatedAt`, `deletedAt:Date|null`. `content` payload schema is **OPEN**; recommended versioned block union must be approved before enforcing strict validation. Default `countsTowardProgress:true` is a REC, not specified. Must check parent visibility and ownership on every write/public read.

### `exercises`

PDF: `lessonId:ObjectId → lessons`, `title`, `description?`, `instructions`, `exerciseType:FILE_BASED|QUIZ`, `completionMode:MANUAL|QUIZ_SUBMISSION`, `isRequired:boolean`, `sortOrder:int`, `status:DRAFT|PUBLISHED|HIDDEN`, `createdAt`, `updatedAt`, `deletedAt:Date|null`. Draft default/deletedAt null are REC. V1 does not accept learner-upload fields. A FILE_BASED exercise can be manually completed; a QUIZ exercise completes from a passing/accepted server submission according to the PDF's required semantics, but whether a pass threshold gates completion is not stated—see open decisions.

### `media_assets`

PDF: `originalName`, `mediaType:IMAGE|VIDEO|AUDIO|PDF`, `mimeType`, `fileSize:int`, `provider`, `storageKey`, `externalMediaId?`, `durationSeconds:int|null`, `uploadedById:ObjectId|null → users`, `createdAt`. `storageKey` and provider metadata are private. Add proposed `visibility:PUBLIC|ENROLLED` (**REC**, needed to separate public assets from paid media). A PUBLIC course introduction must also be referenced by `courses.introVideoAssetId`; visibility by itself does not publish arbitrary content. Validate MIME/size/provider against deployment allowlist; no upload size limit is invented here. Signed URL, if returned, is short-lived and never stored. No `updatedAt`/soft deletion appears in the PDF.

### `lesson_assets`

PDF: `lessonId:ObjectId → lessons`, `assetId:ObjectId → media_assets`, `assetRole:LECTURE_VIDEO|LECTURE_PDF|ATTACHMENT`, `title?`, `sortOrder:int`. Association row is independently referenced. Unique recommendation: `(lessonId,assetId,assetRole)`; validate asset type and same parent chain. Never return storage key.

### `exercise_assets`

PDF: `exerciseId:ObjectId → exercises`, `assetId:ObjectId → media_assets`, `assetRole:QUESTION_PDF|QUESTION_AUDIO|ANSWER_PDF|SOLUTION_VIDEO`, `title?`, `sortOrder:int`. Unique recommendation: `(exerciseId,assetId,assetRole)`. For both question and solution assets, check active course entitlement and exact exercise association. Exercise completion is not an access prerequisite under the owner override.

## Quiz

### `quizzes` with embedded `questions[]` and `options[]`

PDF root fields: `exerciseId:ObjectId → exercises`, `title`, `description?`, `passScorePercent:number|null`, `showCorrectAnswers:boolean`. Unique quiz per exercise is recommended. Embedded question fields (PDF `quiz_questions`): `_id:ObjectId`, `questionText:string`, `questionType` (source names single-choice; enum literal unspecified—proposed `SINGLE_CHOICE`), `explanation?:string`, `points:Decimal128|integer` (PDF numeric; choose exact decimal-safe score representation), `sortOrder:int`, `options[]`. Embedded option fields (PDF `quiz_options`): `_id:ObjectId`, `optionText:string`, `isCorrect:boolean`, `sortOrder:int`. Keep `isCorrect` inside admin-only quiz projection; remove it from student attempt projection. Exactly one correct option per single-choice question is a **REC** based on the owner rule.

### `quiz_attempts` with embedded `answers[]`

PDF root: `userId:ObjectId → users`, `quizId:ObjectId → quizzes`, `exerciseId:ObjectId → exercises`, `status` (source enum literal not visible; proposed `IN_PROGRESS|SUBMITTED`), `score:Decimal128|null`, `maxScore:Decimal128`, `correctCount:int`, `totalQuestions:int`, `gradingSnapshot:object`, `startedAt:Date`, `submittedAt:Date|null`. Embedded answer fields (PDF `quiz_attempt_answers`): `questionId:ObjectId`, `selectedOptionId:ObjectId|null`, `isCorrect:boolean`, `awardedPoints:Decimal128`. Snapshot must include question/option labels and grading inputs as of attempt start/submit so later Admin edits do not alter past result. Never include correctness in in-progress responses. Suggested `answerVersion`/`submittedAt` optimistic concurrency field is REC if concurrent answer edits are possible.

## Progress and account notes

### `lesson_progress`

PDF: `userId:ObjectId → users`, `lessonId:ObjectId → lessons`, `status:NOT_STARTED|IN_PROGRESS|COMPLETED`, `startedAt:Date|null`, `completedAt:Date|null`, `lastAccessedAt:Date|null`, `updatedAt:Date`. Unique `(userId,lessonId)`. `NOT_STARTED` records may be absent; GET can project absent as NOT_STARTED rather than eagerly creating rows.

### `exercise_progress`

PDF: `userId:ObjectId → users`, `exerciseId:ObjectId → exercises`, `status` (PDF enum not legible; align to progress enum only after checking source's intended state), `completionSource:MANUAL|QUIZ`, `startedAt:Date|null`, `completedAt:Date|null`, `updatedAt:Date`. Unique `(userId,exerciseId)`. Completion source is server-derived; student does not choose QUIZ.

### `lesson_notes`

PDF: `userId:ObjectId → users`, `lessonId:ObjectId → lessons`, `content:string`, `createdAt`, `updatedAt`. Unique `(userId,lessonId)`. Bound content length in Zod only after product sets a limit; notes are private to owner/Admin support projection.

## Enrollment

### `enrollments`

PDF: `userId:ObjectId → users`, `courseId:ObjectId → courses`, `sourceOrderId:ObjectId|null → orders`, `activatedAt:Date`, `expiresAt:Date`, `status:ACTIVE|REVOKED`, `createdAt`, `updatedAt`. Unique `(userId,courseId)` recommended to represent a single current entitlement and extend it on renewal. Status plus expiry are both checked; `ACTIVE` with expiry <= now does not grant access. Preserve existing record/progress when renewing.

### `enrollment_adjustments`

PDF: `enrollmentId:ObjectId → enrollments`, `adjustmentType:GRANT|RENEW|REVOKE|RESTORE`, `previousExpiresAt:Date|null`, `newExpiresAt:Date|null`, `durationMonths:int|null`, `orderId:ObjectId|null → orders`, `performedById:ObjectId|null → users`, `reason:string?`, `createdAt`. Append-only. Unique partial `(orderId,adjustmentType)` for order-backed adjustments prevents duplicate renewal effects. Manual admin grant remains an OPEN policy; do not create an endpoint until authorized.

### `renewal_plans`

PDF: `courseId:ObjectId → courses`, `title`, `durationMonths:int`, `status` (literal enum missing in extraction; frontend suggests a `RenewalPlanStatus`, use `ACTIVE|INACTIVE` only as proposed until confirmed), `sortOrder:int`, `createdAt`, `updatedAt`. The PDF omits price; **REC** `price:Decimal128` in VND is needed for truthful checkout and must receive owner approval. Do not use course price as an assumed renewal price.

## Commerce

### `orders` — manual transfer only

PDF fields retained except gateway-specific fields: `orderCode:string`, `userId:ObjectId → users`, `courseId:ObjectId → courses`, `orderType:PURCHASE|RENEWAL`, `renewalPlanId:ObjectId|null → renewal_plans`, `durationMonthsSnapshot:int`, `courseTitleSnapshot:string`, `discountAmount:Decimal128`, `totalAmount:Decimal128`, `couponId:ObjectId|null → coupons`, `status:PENDING|PAID|FAILED|CANCELLED|EXPIRED`, `createdAt`, `paidAt:Date|null`, `expiresAt:Date|null`. Omit `paymentProvider` and `providerPaymentId` per owner. Add owner fields `paymentSubmittedAt:Date|null`, `reviewedById:ObjectId|null → users`, `reviewedAt:Date|null`, `reviewNote:string?`. Proposed base amount snapshot `baseAmount:Decimal128` and course price snapshot `coursePriceSnapshot:Decimal128` are technical extensions; total must remain auditable. Add `idempotencyKey:string?` and `requestFingerprint:string?` only if implementing API idempotency storage. `orderCode` globally unique. PENDING + paymentSubmittedAt null/submitted is a derived UI state, not a new enum. V1 only transitions PENDING→PAID; other PDF statuses remain reserved.

### `coupons`

PDF: `code:string`, `discountType:PERCENT|FIXED`, `discountValue:Decimal128`, `maxDiscount:Decimal128|null`, `usageLimit:int|null`, `startsAt:Date|null`, `expiresAt:Date|null`, `status` (literal enum needs confirmation), `createdAt`, `updatedAt`. Unique normalized code. Proposed `redemptionCount:int` supports atomic usage caps. Per-user limit and stacking are open; do not assume them.

### `coupon_redemptions`

PDF: `couponId:ObjectId → coupons`, `userId:ObjectId → users`, `orderId:ObjectId → orders`, `discountAmount:Decimal128`, `createdAt`. Unique `orderId` prevents two redemptions for one order; compound `(couponId,userId)` must not be unique until per-user policy is approved.

## Platform

### `email_logs` as durable outbox

PDF: `userId:ObjectId|null → users`, `recipientEmail:string`, `templateType:string`, `subject:string`, `status:string`, `dedupeKey:string`, `attempts:int`, `providerMessageId:string|null`, `sentAt:Date|null`, `errorMessage:string|null`, `createdAt`. Proposed status set `PENDING|PROCESSING|SENT|FAILED` and worker fields `availableAt:Date`, `leaseExpiresAt:Date|null`, `lastErrorCode:string|null`. Unique `dedupeKey`. Never log SMTP credentials or full auth links/reset token. Retry count/backoff and retention require operational defaults in BE-01.

### `site_settings`

PDF: `siteName`, `logoAssetId:ObjectId|null → media_assets`, `heroTitle`, `heroDescription`, `heroAssetId:ObjectId|null → media_assets`, `contactEmail`, `contactPhone`, `facebookUrl`, `zaloUrl`, `footerDescription`, `updatedAt`. Treat as singleton with fixed string `_id='site'` (**REC**; this collection is an exception to ObjectId IDs and does not expose the key). Proposed `payment` object contains optional `bankName`, `accountNumber`, `accountHolderName`, `qrAssetId:ObjectId|null`, `transferInstructions`; never seed real/fake values. Public response is an allowlisted projection; Admin payment settings are private. Whether displaying account details publicly is approved operational policy.

### `audit_logs`

PDF: `actorUserId:ObjectId|null → users`, `action:string`, `entityType:string`, `entityId:ObjectId|string`, `oldValue:object|null`, `newValue:object|null`, `ipAddress:string|null`, `createdAt`. Append-only; redact password/token hashes, bank secrets, and signed URLs from snapshots. Admin queries are paginated and role-guarded. Retention and tamper-evidence requirements are open.

## Shared validation and output rules

Required enums are enforced at boundary and schema. ObjectId syntax alone does not prove ownership or same-course ancestry; service performs those checks. Preserve stable IDs for embedded quiz items across edits where possible; an edit after an attempt cannot mutate its frozen snapshot. Courses, sections, lessons, and exercises use only their PDF `deletedAt`; content, users, orders, progress, and logs have no assumed soft-delete field. Full machine-readable field list is [schema-catalog.json](schema-catalog.json).
