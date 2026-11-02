# Typed Mock Data Strategy

## Goals

1. Build a complete Student/Public demo before live backend integration.
2. Match V3 enum names and business rules exactly where specified.
3. Separate database model concepts, API DTOs and presentation view models.
4. Swap mock repositories for HTTP repositories without changing components.

## Type layers

| Layer | Owns | Example (conceptual) | Rules |
|---|---|---|---|
| Domain enums | V3 source values | UserRole, CourseStatus, ContentStatus, SectionType, LessonType, ExerciseType, ProgressStatus, OrderStatus, PaymentStatus, EnrollmentStatus | Exact values from [06 contract map](06-DATABASE-API-FRONTEND-MAPPING.md); no `LOCKED`, `FREE_PREVIEW`, or `EnrollmentStatus.EXPIRED`. |
| API DTO | Actual HTTP JSON | PublicCourseDTO, CourseTreeDTO, MeDTO, OrderDTO, QuizStartDTO | Shape must follow confirmed backend contract; nullable/optional fields only when known. Keep unknown DTOs provisional and isolated. |
| Domain/client model | Stable frontend-owned concepts | CourseSummary, SafeStudentProfile, ExerciseAttempt, AccessSummary | Represent data needed across screens without database-only fields. |
| View model | Render-ready values | CourseCardData, CourseAccessView, OrderSummaryView, QuizQuestionView | Format date/currency/status, combine related API values, omit secrets. |
| Repository result | Async data/errors | Result<T>, ApiFailure with status/code/message/details | Standardized mapping; preserve original code and HTTP status. |

Do not claim these example type names are in the backend. Treat DTOs as an anti-corruption boundary. Do not send frontend view types back as API payloads.

## Repository interfaces

Define domain-oriented interfaces, for example:

- AuthRepository: register, login, logout, refresh, request password reset, reset password, getMe.
- CourseRepository: listPublished, getBySlug, getLearningTree.
- LearningRepository: getLesson, getExercise, getSolutions, completeLesson, completeExercise, mediaAccess.
- QuizRepository: startAttempt, submitAttempt, getResult.
- ProgressRepository: getCourseProgress, getStudentCourses.
- CommerceRepository: validateCoupon, createPurchaseOrder, createRenewalOrder, getOrder, listOrders, listRenewalPlans.
- AccountRepository: get/update profile, list/revoke sessions, get/save lesson note.

These are frontend ports, not statements that every matching backend endpoint method exists. Bind each operation to a confirmed route/method and DTO before API integration. Components call a use-case/query hook; hooks depend on interface, not implementation class.

## Mock implementation and fixtures

- Use deterministic fixtures with stable UUID-shaped identifiers, slugs and timestamps fixed to a scenario clock. They must not depend on random values/current time except a replaceable `now` provider.
- Keep relational integrity: Course → Section → Lesson → Exercise → Assets; User → Enrollment → Course; User/Lesson → Note; Order → Payment → Enrollment; Quiz → Question → Option → Attempt → Answers.
- Use dates in ISO UTC fixtures; UI formatting targets Asia/Ho_Chi_Minh. Store VND as integer/decimal string in fixtures and avoid JS float arithmetic.
- Media fixture uses safe placeholder/approved sample references; never embed copied Lingoni/GWM media or real private signed links.
- Provide a fixture catalog with stable scenario IDs and a switcher visible only in development/demo mode.

## Required personas/scenarios

| Scenario | Data fixture | Expected screen story |
|---|---|---|
| Anonymous guest | No User/Session; public A1.1 | Landing/catalog/detail; three customer-requested free chapters shown as preview, subject to mock-only rule. |
| Registered, no purchase | User STUDENT, no enrollment | Dashboard empty state; course purchase CTA; progress empty. |
| Active student | User + ACTIVE enrollment with future expiresAt | Course tree and paid lesson/media available; order receipt may exist. |
| Partially completed | Active student + lesson/exercise progress | Continue Learning, progress percent from eligible lessons, answer assets only for completed exercise. |
| Expired enrollment | Enrollment status stays ACTIVE/REVOKED according to fixture, expiresAt in past | History/profile preserved, paid asset denied, renewal available; never manufacture EXPIRED enum. |
| Payment processing or failed | Order PENDING or FAILED; corresponding PaymentStatus | Pending has no enrollment; failed has no access; user can see status. |
| Session invalidation (required demo) | Session A REVOKED NEW_LOGIN, Session B ACTIVE | A's next protected request returns SESSION_REVOKED. |
| Wrong coupon (required demo) | Coupon validation response fixture with server-style failure envelope | Checkout preserves typed code and displays mapped message; no invented business rejection categories. |
| Quiz attempt | IN_PROGRESS question DTO without correct flags; SUBMITTED result fixture | Submit uses server-shaped response; result/retry follows scenario capability, not hardcoded product assumption. |

## Mock repository behavior

- Return Promises and configurable latency (e.g., 150–500 ms) so loading states can be reviewed; allow zero-latency mode for deterministic screenshots.
- Model success, empty, network failure, 401, `SESSION_REVOKED`, 403, 404, 409, 422, 429 and 500 using the V3 error envelope. Do not invent endpoint-specific codes.
- Use a single scenario clock/time zone provider to test `expiresAt <= now` and calendar-month outcomes. The backend remains authoritative in production.
- Simulate payment event transitions only through an explicit developer scenario control representing webhook completion; never let “client confirms paid” be a user action.
- Return signed URL-like ephemeral fixtures only for authorized scenarios. Keep them fake/local and do not persist as canonical URLs.
- Keep response fixture DTOs immutable; repository actions return updated scenario state or use an isolated in-memory store per session.

## Preview treatment

Customer requirement says first three chapters free and previewable on YouTube. V3 has no free-preview field or enum. Until backend contract exists, the mock may carry a **mock-only preview manifest** keyed by course slug + section IDs, explicitly labeled as client-provided configuration. Keep it outside V3 domain enum types and never infer it from “first three lessons.” A production endpoint/field/provider and guest permission rule are required before replacing mock.

## DTO-to-view mapping

- Use dedicated pure mapper functions: `toCourseCardData(dto)`, `toCourseAccessView(enrollment, now)`, `toOrderSummary(orderDto)`, `toQuizQuestionView(quizStartQuestion)`.
- Map backend error envelope once in data-access layer into stable `ApiFailure`; form components receive field errors only if backend provides structured details.
- Hide `passwordHash`, `refreshTokenHash`, `storageKey`, raw webhook payload, and `isCorrect` in quiz start DTO/type. Result reveals only according to confirmed result DTO.
- Normalize VND, date/timestamp, URL, and enum display centrally; don't reimplement formatting in each component.

## Switching mock to API

1. Preserve repository interfaces and component/use-case consumers.
2. Add HTTP adapter using confirmed method/path/DTO; validate responses at the boundary.
3. Keep DTO→domain→view mappers; never bind components directly to API responses.
4. Run demo scenarios against contract fixtures before selecting API implementation.
5. Remove scenario switcher from production build; do not remove explicit loading/empty/error handling.
