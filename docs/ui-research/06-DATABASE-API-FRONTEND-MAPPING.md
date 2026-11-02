# Database → API → Frontend contract analysis

## Kết quả đọc V3.0

Tài liệu xác nhận PostgreSQL/Prisma, UUID primary keys, TIMESTAMPTZ, UTC lưu trữ/Asia/Ho_Chi_Minh hiển thị và Decimal(18,0) cho VND. Enums được định nghĩa rõ trong Prisma. Tuy nhiên bảng schema có field list cho 30 entity, nhưng chỉ login_events và payment_webhook_events nêu rõ kiểu/nullability của từng field. Vì vậy tên field dưới đây là catalog đã đọc; **không được suy diễn type/nullability cho 28 bảng còn lại**. Quan hệ/unique được ghi trong phần constraint/relationship của spec.

API phần lớn là danh sách route nối liền, cột “Phương thức” không được điền. V3 không đưa request/response DTO chi tiết, phân trang, filters hoặc sorting. Các route auth/student admin có một số method cụ thể; chỗ nào không nêu method trong báo cáo này đều cần xác nhận.

## Entity/field catalog và phân loại frontend

Phân loại: **FRONTEND_REQUIRED** = dữ liệu cần render/interaction; **BACKEND_ONLY** = không phát trực tiếp cho component; **UNKNOWN** = cần contract/payload quyết định. Một entity có thể có field thuộc nhiều loại.

| Entity | Field names trong schema V3 | Type/nullability có căn cứ | Classification và boundary |
|---|---|---|---|
| users | id, fullName, email, passwordHash, phone, avatarAssetId, role, status, emailVerifiedAt, lastLoginAt, createdAt, updatedAt | Field types/nullability chưa nêu đầy đủ. role/status enums có giá trị xác định. | FRONTEND_REQUIRED: id, fullName, email, phone/avatar nếu public API expose, role/status view; BACKEND_ONLY: passwordHash; UNKNOWN: avatar DTO, optional/null handling. |
| user_sessions | id, userId, refreshTokenHash, deviceId, deviceName, userAgent, ipAddress, status, createdAt, lastActiveAt, expiresAt, revokedAt, revokeReason | SessionStatus và SessionRevokeReason enums có; field types/nullability khác chưa đủ. | FRONTEND_REQUIRED: safe session summary/deviceName/lastActiveAt/status; BACKEND_ONLY: refreshTokenHash, raw userAgent/IP unless contract explicitly supports; UNKNOWN: exact safe DTO. |
| login_events | id, userId, emailAttempted, ipAddress, userAgent, success, failureReason, createdAt | Explicit: id/userId UUID; emailAttempted VARCHAR(255); ipAddress VARCHAR(45); userAgent TEXT; success BOOLEAN; failureReason VARCHAR(100); createdAt TIMESTAMPTZ; nullable: userId/emailAttempted/ipAddress/userAgent/failureReason. | BACKEND_ONLY; operational security record. Không có student endpoint cho login history. |
| password_reset_tokens | id, userId, tokenHash, expiresAt, usedAt, createdAt | Không đủ kiểu/nullability. | BACKEND_ONLY; không expose tokenHash. Reset token chỉ truyền qua flow phù hợp, response chưa nêu. |
| courses | id, code, title, slug, shortDescription, description, objectives, requirements, level, thumbnailAssetId, bannerAssetId, price, accessDurationMonths, status, sortOrder, createdAt, updatedAt, deletedAt | CourseStatus enum; VND Decimal(18,0) global convention; field-level nullability/types khác thiếu. | FRONTEND_REQUIRED: title/slug/description/level/price/duration/status/image URLs; BACKEND_ONLY: internal storage keys if any; UNKNOWN: public DTO/select fields. |
| course_sections | id, courseId, title, description, sectionType, sortOrder, status, createdAt, updatedAt, deletedAt | SectionType CHAPTER/EXAM_PREP; ContentStatus enum; nullability/type thiếu. | FRONTEND_REQUIRED: id/title/type/order/status; UNKNOWN: free-preview marker (không có trong field list), public state mapping. |
| lessons | id, sectionId, title, description, content, lessonType, estimatedMinutes, countsTowardProgress, sortOrder, status, createdAt, updatedAt, deletedAt | LessonType LECTURE/PRACTICE; ContentStatus; field-level type/nullability thiếu. | FRONTEND_REQUIRED: id/title/type/estimatedMinutes/status/progress relation; UNKNOWN: content format and public projection. |
| exercises | id, lessonId, title, description, instructions, exerciseType, completionMode, isRequired, sortOrder, status, createdAt, updatedAt, deletedAt | ExerciseType FILE_BASED/QUIZ; CompletionMode MANUAL/QUIZ_SUBMISSION; ContentStatus; other types chưa nêu. | FRONTEND_REQUIRED: title/instructions/type/required/progress/access view; UNKNOWN: access-state DTO. |
| media_assets | id, originalName, mediaType, mimeType, fileSize, provider, storageKey, externalMediaId, durationSeconds, uploadedById, createdAt, deletedAt | MediaType IMAGE/VIDEO/AUDIO/PDF; field types/nullability thiếu. V3 env example: MEDIA_SIGNED_URL_TTL_SECONDS=60, MAX_UPLOAD_SIZE_MB=100. | FRONTEND_REQUIRED: safe display metadata/short-lived signed URL; BACKEND_ONLY: storageKey, credentials; UNKNOWN: provider URL DTO. TTL 60s là env mẫu, cấu hình cần verify theo runtime. |
| lesson_assets | id, lessonId, assetId, assetRole, title, sortOrder, createdAt | LessonAssetRole LECTURE_VIDEO/LECTURE_PDF/ATTACHMENT; types thiếu. | FRONTEND_REQUIRED: role/title/access link if permitted; UNKNOWN: entitlement filtering response. |
| exercise_assets | id, exerciseId, assetId, assetRole, title, sortOrder, createdAt | ExerciseAssetRole QUESTION_PDF/QUESTION_AUDIO/ANSWER_PDF/SOLUTION_VIDEO; types thiếu. | FRONTEND_REQUIRED: question assets; answer/solution only after server authorization; never expose storageKey. |
| quizzes | id, exerciseId, title, description, passScorePercent, showCorrectAnswers, createdAt, updatedAt | Numeric/boolean inferred from names only, not declared. | FRONTEND_REQUIRED: title/questions/result config only as server allows; UNKNOWN: when/how correct answers shown, pass result contract. |
| quiz_questions | id, quizId, questionText, questionType, explanation, points, sortOrder, createdAt, updatedAt | QuestionType SINGLE_CHOICE; remaining types/nullability thiếu. | FRONTEND_REQUIRED: question/options, no isCorrect in start DTO; explanation policy unknown. |
| quiz_options | id, questionId, optionText, isCorrect, sortOrder | isCorrect field present; field types not explicit. | FRONTEND_REQUIRED: id/text/order for attempt; BACKEND_ONLY at quiz start: isCorrect. |
| quiz_attempts | id, userId, quizId, exerciseId, status, score, maxScore, correctCount, totalQuestions, gradingSnapshot, startedAt, submittedAt | QuizAttemptStatus IN_PROGRESS/SUBMITTED; other types/nullability thiếu. | FRONTEND_REQUIRED: safe submitted result; BACKEND_ONLY/UNKNOWN: gradingSnapshot internals and answer reveal policy. |
| quiz_attempt_answers | id, attemptId, questionId, selectedOptionId, isCorrect, awardedPoints | Types/nullability thiếu. | BACKEND_ONLY for grading; result projection only if API explicitly permits. |
| lesson_progress | id, userId, lessonId, status, startedAt, completedAt, lastAccessedAt, updatedAt | ProgressStatus NOT_STARTED/IN_PROGRESS/COMPLETED; types/nullability thiếu. | FRONTEND_REQUIRED via progress view model; do not calculate authority from browser alone. |
| exercise_progress | id, userId, exerciseId, status, completionSource, startedAt, completedAt, updatedAt | ProgressStatus; CompletionSource MANUAL/QUIZ; types/nullability thiếu. | FRONTEND_REQUIRED via exercise state; backend owns completion. |
| enrollments | id, userId, courseId, sourceOrderId, activatedAt, expiresAt, status, createdAt, updatedAt | EnrollmentStatus ACTIVE/REVOKED only. | FRONTEND_REQUIRED: access summary and expiry; expired is derived when expiresAt<=now, not enum. |
| enrollment_adjustments | id, enrollmentId, adjustmentType, previousExpiresAt, newExpiresAt, durationMonths, orderId, performedById, reason, createdAt | GRANT/RENEW/REVOKE/RESTORE enum; types otherwise missing. | BACKEND_ONLY or safe account history if API later exposes; admin audit context not in scope. |
| renewal_plans | id, courseId, title, durationMonths, price, status, sortOrder, createdAt, updatedAt | RenewalPlanStatus ACTIVE/INACTIVE; VND Decimal convention, other types/nullability thiếu. | FRONTEND_REQUIRED: active plan title/duration/price; inactive plans omitted by API. |
| orders | id, orderCode, userId, courseId, orderType, renewalPlanId, durationMonthsSnapshot, courseTitleSnapshot, originalPrice, discountAmount, totalAmount, couponId, paymentProvider, providerPaymentId, status, createdAt, paidAt, expiresAt | OrderType PURCHASE/RENEWAL; OrderStatus PENDING/PAID/FAILED/CANCELLED/EXPIRED; VND Decimal convention. | FRONTEND_REQUIRED: order code/item/amount/status/date; BACKEND_ONLY: providerPaymentId unless needed; NEVER client-assert payment success. |
| payment_transactions | id, orderId, provider, providerTransactionId, amount, currency, status, paidAt, providerReference, createdAt | PaymentStatus PENDING/SUCCESS/FAILED; types/nullability thiếu. | BACKEND_ONLY or safe summarized payment status; provider identifiers should not leak without reason. |
| payment_webhook_events | id, provider, eventId, orderCode, payload, signatureValid, processingStatus, errorMessage, receivedAt, processedAt | Explicit: id UUID, provider VARCHAR(50), eventId VARCHAR(255), orderCode VARCHAR(60), payload JSONB, signatureValid BOOLEAN, processingStatus enum, errorMessage TEXT, receivedAt/processedAt TIMESTAMPTZ; nullable: orderCode/errorMessage/processedAt. | BACKEND_ONLY; raw payload/signature/event errors not student DTO. |
| coupons | id, code, discountType, discountValue, maxDiscount, usageLimit, startsAt, expiresAt, status, createdAt, updatedAt | DiscountType PERCENT/FIXED; CouponStatus ACTIVE/INACTIVE; types/nullability thiếu. | FRONTEND_REQUIRED: entered code + server validation result/discount amount; not usage internals. |
| coupon_redemptions | id, couponId, userId, orderId, discountAmount, createdAt | Types/nullability thiếu. | BACKEND_ONLY; redemption committed with order by server. |
| lesson_notes | id, userId, lessonId, content, createdAt, updatedAt | Type/nullability thiếu; unique userId+lessonId. | FRONTEND_REQUIRED: content/timestamps for the current student's note. |
| email_logs | id, userId, recipientEmail, templateType, subject, status, dedupeKey, attempts, providerMessageId, sentAt, errorMessage, createdAt | EmailStatus/EmailTemplateType enums; types/nullability thiếu. | BACKEND_ONLY; no student email-log API specified. |
| site_settings | id, siteName, logoAssetId, heroTitle, heroDescription, heroAssetId, contactEmail, contactPhone, facebookUrl, zaloUrl, footerDescription, updatedAt | Type/nullability thiếu. | FRONTEND_REQUIRED: public settings subset; never assume private settings public. |
| audit_logs | id, actorUserId, action, entityType, entityId, oldValue, newValue, ipAddress, createdAt | Types/nullability thiếu. | BACKEND_ONLY; Admin/audit UI excluded. |

## Enum catalog

| Enum | Values chính xác trong V3 |
|---|---|
| UserRole | STUDENT, ADMIN |
| UserStatus | ACTIVE, BLOCKED |
| SessionStatus | ACTIVE, REVOKED, EXPIRED |
| SessionRevokeReason | NEW_LOGIN, LOGOUT, ADMIN_REVOKE, PASSWORD_CHANGED, ACCOUNT_BLOCKED, REFRESH_REUSE |
| CourseStatus | DRAFT, PUBLISHED, ARCHIVED |
| SectionType | CHAPTER, EXAM_PREP |
| ContentStatus | DRAFT, PUBLISHED, HIDDEN |
| LessonType | LECTURE, PRACTICE |
| ExerciseType | FILE_BASED, QUIZ |
| CompletionMode | MANUAL, QUIZ_SUBMISSION |
| ProgressStatus | NOT_STARTED, IN_PROGRESS, COMPLETED |
| CompletionSource | MANUAL, QUIZ |
| MediaType | IMAGE, VIDEO, AUDIO, PDF |
| LessonAssetRole | LECTURE_VIDEO, LECTURE_PDF, ATTACHMENT |
| ExerciseAssetRole | QUESTION_PDF, QUESTION_AUDIO, ANSWER_PDF, SOLUTION_VIDEO |
| QuestionType | SINGLE_CHOICE |
| QuizAttemptStatus | IN_PROGRESS, SUBMITTED |
| OrderType | PURCHASE, RENEWAL |
| OrderStatus | PENDING, PAID, FAILED, CANCELLED, EXPIRED |
| PaymentStatus | PENDING, SUCCESS, FAILED |
| EnrollmentStatus | ACTIVE, REVOKED |
| EnrollmentAdjustmentType | GRANT, RENEW, REVOKE, RESTORE |
| DiscountType | PERCENT, FIXED |
| CouponStatus | ACTIVE, INACTIVE |
| RenewalPlanStatus | ACTIVE, INACTIVE |
| EmailStatus | PENDING, PROCESSING, SENT, FAILED |
| EmailTemplateType | PURCHASE, RENEWAL, EXPIRY_REMINDER, RESET_PASSWORD |
| WebhookProcessingStatus | RECEIVED, PROCESSED, FAILED, IGNORED |

**Lưu ý:** V3 có bảng roles liệt kê GUEST/STUDENT/ADMIN nhưng UserRole enum lưu trong user chỉ có STUDENT/ADMIN. Cho đến khi backend giải thích khác, xem GUEST là anonymous context, không phải role được lưu. Expired enrollment và preview/locked access cũng không phải schema enums.

## API catalog và contract gaps

| Nhóm | Endpoint được liệt kê trong V3 | Auth | Contract còn thiếu |
|---|---|---|---|
| Auth | POST /api/v1/auth/register, /login, /logout, /refresh, /forgot-password, /reset-password, /change-password; GET /api/v1/auth/me | Public/login hoặc session; method có nêu ở module auth | Request/response DTO, cookie vs token storage, validation fields |
| Public | /api/v1/courses, /api/v1/courses/:slug, /api/v1/public/settings | Public | Endpoint table omits HTTP methods; response projection/pagination/filter/sort chưa nêu |
| Student | /api/v1/me, /api/v1/me/courses, /api/v1/me/orders, /api/v1/me/sessions, /api/v1/me/courses/:courseId/progress; /api/v1/me/sessions/:id | Auth | Methods chỉ nêu rõ cho GET/PATCH /api/v1/me và GET/DELETE session trong Module 01/02; còn lại DTO, filters/pagination, methods thiếu |
| Learning | /api/v1/learn/courses/:courseId/tree; /api/v1/learn/lessons/:lessonId; /api/v1/learn/exercises/:id; /api/v1/learn/exercises/:id/solutions; /api/v1/learn/media/:assetId/access; /api/v1/learn/lessons/:lessonId/complete; /api/v1/learn/exercises/:id/start; /api/v1/learn/exercises/:id/complete; /api/v1/learn/exercises/:id/quiz/start; /api/v1/learn/quiz-attempts/:id/submit; /api/v1/learn/quiz-attempts/:id/result; /api/v1/learn/lessons/:id/note | Auth + enrollment/content/access rules | Methods, input/output DTO, signed URL renewal, quiz result policy thiếu |
| Commerce | /api/v1/orders; /api/v1/renewals/orders; /api/v1/coupons/validate; /api/v1/webhooks/payments/:provider; /api/v1/orders/:id; /api/v1/courses/:id/renewal-plans | Student except webhook provider | Methods, checkout/payment provider/return URL contract, coupon error codes thiếu |
| Error | {success:false,error:{code,message,details:null}}; HTTP 200/201/204/400/401/403/404/409/422/429/500 | N/A | Per-field validation shape, retryability, correlation IDs, pagination meta format thiếu |

## Mapping: DB entity → DTO → frontend type → view model → UI

Các DTO/type dưới đây là **target boundary đề xuất**, không khẳng định đã tồn tại trong backend. Giữ type DTO phản ánh API thực tế sau khi nhận contract; không copy Prisma model vào frontend.

| Domain data / DB | API DTO boundary cần chốt | Frontend type boundary | View model transform | UI components |
|---|---|---|---|---|
| courses + sections + lessons + exercises + assets | PublicCourseDTO, CourseTreeDTO; chỉ field được phép và signed asset URLs | CourseCardData, CourseDetailData, LearningTreeData | Decimal string→formatted VND; timestamps→localized; derive preview/available display only from explicit API flag | CourseCard, CourseDetail, CourseTree, AccessState |
| users + sessions | MeDTO, SafeSessionDTO | StudentProfile, SessionSummary | Omit passwordHash/refreshTokenHash/storage metadata; date formatting | ProfileForm, SessionList |
| enrollments + adjustments + renewal plans | EnrollmentSummaryDTO, RenewalPlanDTO | CourseAccessSummary, RenewalOption | expiry comparison against server time/version; expired is derived view state, enum remains ACTIVE/REVOKED | EnrollmentCard, AccessBanner, RenewalCard |
| exercises + progress + assets | ExerciseDTO, ExerciseSolutionsDTO, MediaAccessDTO | ExerciseView, ExerciseAssetView | expose only question assets first; solutions from authorized endpoint after completion | ExercisePanel, PDFViewer, AudioPlayer, SolutionPanel |
| quiz + questions + options + attempts + answers | QuizStartDTO without isCorrect; QuizResultDTO after submit | QuizSession, QuizResult | map selected option IDs; never infer score/correct answer client-side | QuizQuestion, QuizProgress, QuizResult |
| lesson/course progress | LessonProgressDTO, CourseProgressDTO | LearningProgress | map enum→badge/icon; percent server-derived | ProgressBar, LessonStatusBadge |
| orders/payments/coupons | CreateOrderRequest/OrderDTO/CouponValidationDTO (to define) | CheckoutState, OrderSummary | format amounts; status→message; enrollment only after API confirms | CheckoutForm, CouponField, PaymentStatusPanel |
| lesson_notes | LessonNoteDTO | LessonNote | local editing state plus server-saved timestamp | LessonNotesEditor |
| site_settings | PublicSettingsDTO | PublicSiteConfig | safe subset; asset URL mapping | PublicShell, Footer, Hero |
| login_events/webhook_events/password tokens/audit/email logs | No student DTO listed | None unless API is later authorized | Do not surface internal records | No current student-facing component |

## Transform and security rules

1. Keep money as decimal string/decimal-safe value at API edge; display VND without float arithmetic.
2. Parse timestamp with explicit timezone; server persists UTC and UI displays Asia/Ho_Chi_Minh.
3. Treat API status/enums as exact strings; do not add `EXPIRED`, `LOCKED`, or `FREE_PREVIEW` to schema type aliases.
4. Never serialize passwordHash, refreshTokenHash, storageKey, provider secret, quiz isCorrect at start, or raw webhook payload to UI.
5. Signed media links are short lived; V3 sample environment sets MEDIA_SIGNED_URL_TTL_SECONDS=60. MAX_UPLOAD_SIZE_MB=100 is also in the sample environment. These are configured sample values; verify deployed/runtime config before treating them as effective limits. Do not store signed links as permanent asset URLs.
6. API errors normalize at repository boundary; preserve HTTP status, code, message, details and field errors only if supplied.

## Contract blockers before real integration

- Publish a typed DTO/OpenAPI contract for every student/public endpoint, with HTTP method, auth, schema, nullable fields, validation errors and examples.
- Define pagination/filter/sort for public course list, course tree, orders and session list if those lists can grow.
- Define course preview access metadata for first three CHAPTER sections and YouTube asset delivery.
- Confirm whether API sends amount as string and dates as ISO-8601; field types are not explicit for most tables.
- Define exact payload for access denied/expired, pending/failed payment, coupon validation, quiz results and note upsert.
