# Domain Type Boundaries

## Layers

1. **Confirmed V3 vocabulary** — `src/domains/contracts/backend-enums.ts` contains enum values copied from the Phase 0 V3 mapping report.
2. **Frontend domain/presentation models** — each domain's `models.ts` supplies UI-safe models and presentation unions. These are not Prisma entities and are not asserted to match API DTOs.
3. **Provisional demo fixtures** — `src/data/mock/fixtures.ts` contains deterministic sample data and mock-only capabilities.
4. **Repository ports and implementation** — `LmsRepository` is a frontend port; `createMockRepository` is an in-memory adapter. No HTTP adapter or unconfirmed DTO was added.
5. **Future API boundary** — Phase 2 must add confirmed DTOs, runtime validation, and DTO-to-domain/view mappers before connecting a real endpoint.

## Confirmed V3 enum values

`UserRole: STUDENT | ADMIN`; `UserStatus: ACTIVE | BLOCKED`; `SessionStatus: ACTIVE | REVOKED | EXPIRED`; `SessionRevokeReason: NEW_LOGIN | LOGOUT | ADMIN_REVOKE | PASSWORD_CHANGED | ACCOUNT_BLOCKED | REFRESH_REUSE`; `CourseStatus: DRAFT | PUBLISHED | ARCHIVED`; `SectionType: CHAPTER | EXAM_PREP`; `ContentStatus: DRAFT | PUBLISHED | HIDDEN`; `LessonType: LECTURE | PRACTICE`; `ExerciseType: FILE_BASED | QUIZ`; `CompletionMode: MANUAL | QUIZ_SUBMISSION`; `ProgressStatus: NOT_STARTED | IN_PROGRESS | COMPLETED`; `CompletionSource: MANUAL | QUIZ`; `MediaType: IMAGE | VIDEO | AUDIO | PDF`; `LessonAssetRole: LECTURE_VIDEO | LECTURE_PDF | ATTACHMENT`; `ExerciseAssetRole: QUESTION_PDF | QUESTION_AUDIO | ANSWER_PDF | SOLUTION_VIDEO`; `QuestionType: SINGLE_CHOICE`; `QuizAttemptStatus: IN_PROGRESS | SUBMITTED`; `OrderType: PURCHASE | RENEWAL`; `OrderStatus: PENDING | PAID | FAILED | CANCELLED | EXPIRED`; `PaymentStatus: PENDING | SUCCESS | FAILED`; `EnrollmentStatus: ACTIVE | REVOKED`; `EnrollmentAdjustmentType: GRANT | RENEW | REVOKE | RESTORE`; `DiscountType: PERCENT | FIXED`; `CouponStatus: ACTIVE | INACTIVE`; `RenewalPlanStatus: ACTIVE | INACTIVE`; `EmailStatus: PENDING | PROCESSING | SENT | FAILED`; `EmailTemplateType: PURCHASE | RENEWAL | EXPIRY_REMINDER | RESET_PASSWORD`; `WebhookProcessingStatus: RECEIVED | PROCESSED | FAILED | IGNORED`.

The Phase 0 report explicitly states that `GUEST` is an anonymous UI context, not a persisted `UserRole`. There is no `EnrollmentStatus.EXPIRED`, `CourseStatus.LOCKED`, or `ContentStatus.FREE_PREVIEW`.

## Frontend-owned presentation models

Important models include `CourseSummaryModel`, `CourseDetailModel`, `CourseSectionModel`, `LessonSummaryModel`, `CourseAccessViewModel`, `MockPreviewManifest`, `MediaViewModel`, `ExerciseViewModel`, `QuizAttemptViewModel`, `QuizResultViewModel`, `CourseProgressViewModel`, `EnrollmentSummaryViewModel`, `OrderSummaryViewModel`, `CouponValidationViewModel`, `StudentProfileViewModel`, and `SessionSummaryViewModel`.

Presentation-only access kinds are `available`, `customer-preview`, `restricted`, `expired-display`, `loading`, and `error`. Expired display preserves the underlying enrollment status and is derived in the repository using the injected clock. These are not backend enums or authorization decisions.

## Sensitive and authoritative data boundaries

- Quiz attempt questions/options contain no `isCorrect` or `correctOptionId`. Correct answer review can appear only in a separate result view model when `canReviewAnswers` is true.
- Media models contain a safe URL and expiry metadata if supplied; no canonical storage key.
- Account models contain only display name/email/status and safe device label/status/time. They omit hashes, IP, and raw user-agent.
- Course progress percentages/counts are provided by fixture/repository and are presented as-is.
- VND is stored as integer strings in fixtures; formatter uses `BigInt`/`Intl.NumberFormat`, and components do not calculate prices.
- UTC is retained for timestamps; new formatters explicitly display `Asia/Ho_Chi_Minh`. No expiry-month arithmetic exists.

