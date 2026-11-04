# Frontend-to-Backend API Mapping

## Audit scope and current state

The repository is a Vite/React frontend demo; the README explicitly says there is no backend or real authentication. Public and student data repositories return fixtures/local state. TanStack Query query keys partition `public-demo` and `student` data; product mutations invalidate the student query root. `AuthSessionProvider` restores demo state from the auth mock and removes student cached data on logout/revocation. These are interface facts, not server guarantees.

Current route consumers were checked in `frontend/src/app/public-site/routes.tsx`, `frontend/src/app/auth/routes.tsx`, `frontend/src/app/student/pages.tsx`, and `frontend/src/app/student-lms/{learning-pages,commerce-pages,account-pages}.tsx`. The routed journeys are public `/`, `/courses`, `/courses/:slug`, `/courses/:slug/preview`, `/help`; auth `/login`, `/register`, `/forgot-password`, `/reset-password`; Student `/student`, `/student/courses`, `/student/progress`, `/student/orders`, `/student/orders/:id`, `/student/courses/:courseId/renew`, `/student/profile`, `/student/security/password`, `/student/security/sessions`; learning `/learn/courses/:courseId`, `/learn/courses/:courseId/sections/:sectionId`, `/learn/lessons/:lessonId`, `/learn/exercises/:exerciseId`, `/learn/quizzes/:attemptId`, `/learn/quizzes/:attemptId/result`; and demo checkout/order routes. No Admin route or repository is present.

## Mapping

| Frontend feature / current operation | Expected DTO | Proposed API | Backend module | Alignment |
|---|---|---|---|---|
| Public catalog — `PublicCourseRepository.listCourses()` | `CourseSummaryModel[]`, string `priceVnd`, status/counts | `GET /courses` | catalog | ADAPTER_CHANGE: page/filter DTO and price required |
| Public detail — `getCourseBySlug(slug)` | `CourseDetailModel` with nested sections/lessons | `GET /courses/{slug}` | catalog | ADAPTER_CHANGE: backend should omit hidden/unpublished children |
| Mock preview — `getPreviewManifest`, `getPreviewLesson` | fixed three-section manifest + paragraphs/phrases/media | No A1.1 endpoint; public course info/media in `GET /courses/{slug}` | catalog/media | FRONTEND_REFACTOR_REQUIRED: remove tuple/fixed IDs and gated lesson access; optional future generic preview requires product policy |
| Demo login/register/reset | `DemoSession`, reset token state, fictional account | Auth endpoints in OpenAPI | auth | ADAPTER_CHANGE: real access token + cookie refresh, public-safe user DTO; remove returned reset token |
| Student home — `StudentRepository.getDashboard/listCourses(sessionId)` | dashboard profile, course records, progress/access | `GET /me/dashboard`, `GET /me/courses` | account/catalog/enrollment/progress | ADAPTER_CHANGE: do not pass session ID as authority; use Authorization/session cookie |
| Course overview — `learning.getCourseOverview` | tree, access, aggregate progress | `GET /me/courses/{courseId}` | learning/enrollment/progress | ADAPTER_CHANGE: real entitlement and counts |
| Section/lesson — `getSection`, `getLesson` | section, content, assets, exercise summaries, navigation | `GET /learn/courses/{courseId}/sections/{sectionId}`, `GET /learn/lessons/{lessonId}` | learning/media/progress | ADAPTER_CHANGE: request signed URL separately after authorization; hide draft content |
| Exercise — `getExercise`, `completeExercise` | assets + capabilities/status | `GET /learn/exercises/{id}`, `POST /learn/exercises/{id}/complete` | learning/progress | FRONTEND_REFACTOR_REQUIRED: capability `canViewSolutions` cannot depend on completion; derive from entitlement/association |
| Quiz — start/select/submit/result/retry methods | attempt DTO excludes correct data; result may include review | Quiz-attempt endpoints | quiz/progress | ADAPTER_CHANGE: make selected answers durable; enforce server scoring and no correct-answer leak |
| Progress — `getProgress`, complete lesson/exercise | server-derived percentage and lesson items | `GET /learn/courses/{courseId}/progress`; completion endpoints | progress | COMPATIBLE with DTO adapter; remove any client-authoritative completion flags |
| Notes — get/save by lesson | string content | `GET/PUT /learn/lessons/{lessonId}/notes` | learning | COMPATIBLE with envelope/empty-note mapping |
| Checkout quote — `getCheckoutContext(context,planId,coupon)` | VND strings, plan, duration, `hypotheticalPrice:true` | `GET /checkout/quote?courseId=...&orderType=...` | commerce | FRONTEND_REFACTOR_REQUIRED: delete `hypotheticalPrice`; replace opaque context with IDs; quote is server calculated |
| Coupon — `validateCoupon(context,code,planId)` | valid/invalid union | `POST /coupons/validate` | commerce | ADAPTER_CHANGE: server computes discount; preserve typed invalid state |
| Order — `createOrder`, `listOrders`, `getOrder` | summary/details/enrollment/access | `POST/GET /orders` | commerce | FRONTEND_REFACTOR_REQUIRED: create PENDING only, return snapshots, no immediate enrollment |
| Payment — `simulateDemoPayment(outcome)` | simulated success/failure/payment result | `POST /orders/{id}/confirm-transfer`, then Admin approval separately | commerce | FRONTEND_REFACTOR_REQUIRED: remove simulation success/failure; transfer submission must stay PENDING |
| Renewal — `getRenewalPlans(courseId)` | title, months, price string | `GET /renewals/courses/{courseId}/plans` | enrollment/commerce | BUSINESS_DECISION_PENDING: PDF renewal plan price omitted |
| Profile — get/update/change password | safe profile, password input | `/me/profile`, `/me/password` | account/auth | ADAPTER_CHANGE: current mock only exposes display name; never send session ID |
| Sessions — list/revoke | safe session summaries | `/me/sessions`, `DELETE /me/sessions/{sessionId}` | auth | ADAPTER_CHANGE: server revocation + current-session handling; mock timestamps/status must map |
| Admin CMS/commerce | No production Admin frontend/repositories found | Admin paths in OpenAPI | admin/catalog/commerce | No current consumer; contract based on PDF owner requirement only |

## DTO adaptation rules

- Convert `_id` to frontend `id`; convert BSON Decimal128 to VND decimal integer string (`priceVnd`, `amountVnd`, etc.). Never parse through binary float.
- Server returns public DTOs without hashes, private user/session metadata, storage keys, bank settings except checkout-safe fields, or quiz answer keys.
- Replace mock `sessionId` arguments with a configured HTTP client that sends Authorization access token and includes credentials only for refresh/session-cookie endpoints. Refresh once on eligible 401, then clear auth and all student query cache on `SESSION_REVOKED`.
- Map frontend `displayName` to PDF `users.fullName`; do not persist a duplicate displayName field. `SessionSummaryViewModel.lastActiveAt` is not a PDF field; project it from existing session timestamps for V1 or approve a dedicated timestamp extension before storing it.
- Preserve query boundaries: public catalog/detail cache can be public; all student keys remain keyed by authenticated identity/session generation. On logout, refresh failure, or revoked session, cancel/remove all student queries.
- Mutation invalidation can keep `['student']` root initially; successful order approval from Admin needs event/poll/refetch or eventual consistency policy for Student `orders`, `enrollment`, and dashboard.

## Confirmed mock mismatches from source

- `frontend/src/data/public-demo/types.ts` fixes preview to a three-ID tuple, and `frontend/src/data/public-demo/repository.ts` exposes a preview manifest/lesson. This is frontend mock structure only; BE-00 does not translate it into free-chapter authorization.
- `frontend/src/data/student-demo/product-repository.ts` currently filters `ANSWER_PDF` and `SOLUTION_VIDEO` unless exercise progress is `COMPLETED`. That directly conflicts with the owner override. Production adapter must return those associated assets whenever entitlement is valid.
- The demo auth API returns a reset token and separately queries `getResetTokenState(token)`. A real forgot-password API must not return the token to the client or expose a token-probe endpoint; validate only when the reset form is submitted and show the resulting error state.
- The same mock's `simulateDemoPayment` can set an order to `FAILED`, or set it `PAID` and create/extend enrollment immediately from a client-selected outcome. This conflicts with external manual transfer and Admin-only approval; remove this operation from production.
- Checkout fixture/context uses one demo A1.1 course, static renewal plans/prices, and returns `hypotheticalPrice: true`. These are not valid product pricing inputs. API quote and order creation must load live Admin-entered price and immutable snapshots; renewal pricing waits on O-01.
- `domains/contracts/backend-enums.ts` exposes `PaymentStatus.SUCCESS|FAILED` and session revoke reasons not fully enumerated in the PDF. Treat these as frontend vocabulary; V1 order state uses the PDF `orders.status`, while payment gateway outcomes are removed. Reuse revoke-reason strings only after confirming them as backend enum values.
- Frontend `DemoSession.id` is explicitly documented as a local demo identifier, not a JWT or authorization credential. Repository methods currently receive it as a parameter; the real adapter must use server-validated bearer/session credentials instead.

## Required frontend refactors before production adapter

1. Remove hardcoded A1.1 / three-chapter tuple gating. The preview page must use only explicitly public course intro/media until a generic preview policy/schema is approved.
2. Change exercise answer capability to follow valid enrollment and exact asset association, independent of exercise completion.
3. Replace checkout mock's `hypotheticalPrice` and derived hardcoded pricing with server quote/order snapshots.
4. Remove `simulateDemoPayment` and success/failure screens as payment truth. Show static QR/instructions, transfer-submitted state, and pending Admin review. Enrollment follows Admin approval only.
5. Replace demo session restore/fictional `.test` accounts and mock reset tokens with access JWT + HttpOnly refresh cookie and real auth operations.
6. Add Admin adapter only when an Admin UI is scheduled; do not infer Admin UI behavior from existing student components.
