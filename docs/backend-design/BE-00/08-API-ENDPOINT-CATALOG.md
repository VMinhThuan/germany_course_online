# API Endpoint Catalog

## Shared rules

- Base path is /api/v1; paths below omit that prefix.
- Success uses { success: true, data }; error uses { success: false, error: { code, message, details }, requestId }. Proposed common codes: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, SESSION_REVOKED, RATE_LIMITED, INTERNAL_ERROR; specific examples include COMPLETION_REQUIREMENTS_UNMET and ORDER_NOT_SUBMITTED.
- ObjectId path params are 24-character hex; slug is normalized. Lists use page=1, pageSize=20 by default, maximum 100; response includes items/page/pageSize/total/hasMore.
- Money is a nonnegative VND decimal integer string backed by MongoDB Decimal128. Never return password/hash/session secrets, storage keys, or quiz answer keys before submission.
- Idempotency/replay behavior and related collections are listed per endpoint. All writes validate Zod input, role, ownership, and parent references.
- Routes whose idempotency cell names Idempotency-Key accept that optional header; reusing it with the same request replays the original create/action result.

## Endpoint counts

| Domain | Operations |
|---|---:|
| Public | 4 |
| Authentication | 7 |
| Student | 7 |
| Learning | 10 |
| Quiz | 6 |
| Commerce | 7 |
| Admin Catalog | 23 |
| Admin Management | 21 |
| **Total** | **85** |

## Public (4)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /site-settings/public | Read allowlisted public site settings; query: —; body: — → PublicSiteSettings | PUBLIC | site_settings,media_assets; No current typed settings method | Public projection only; Safe read |
| GET /courses | List published courses; query: page,pageSize,level?,q?,sort?; body: — → CoursePage | PUBLIC | courses,course_sections,lessons,media_assets; PublicCourseRepository.listCourses() | Published and non-deleted hierarchy only; Safe read |
| GET /courses/{slug} | Read published course and public outline; query: —; body: — → CourseDetail | PUBLIC | courses,course_sections,lessons,exercises,media_assets; PublicCourseRepository.getCourseBySlug(slug) | Draft/soft-deleted is not found; Safe read |
| GET /media/{assetId}/metadata | Read metadata of explicitly public media; query: —; body: — → PublicMedia | PUBLIC | media_assets,courses,site_settings; Current course DTO has thumbnailUrl | Public visibility is a proposed media field; Safe read |

## Authentication (7)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| POST /auth/register | Register a Student account; query: —; body: RegisterRequest → AuthResult | PUBLIC | users,user_sessions,login_events,email_logs; AuthRepository.registerDemoAccount(input) | Server assigns STUDENT; Unique email; replay returns conflict |
| POST /auth/login | Authenticate and replace active Student session; query: —; body: LoginRequest → AuthResult | PUBLIC | users,user_sessions,login_events; AuthRepository.signInWithCredentials(email,password) | Generic failure; rate limited; Creates/replaces session |
| POST /auth/refresh | Rotate refresh token and issue access token; query: —; body: — → AuthResult | REFRESH_COOKIE | users,user_sessions; AuthSessionProvider.refreshSession() | Origin and CSRF checks; Single-use rotation |
| POST /auth/logout | Revoke current session and clear cookie; query: —; body: — → EmptyResult | STUDENT_OR_ADMIN | user_sessions,audit_logs; AuthRepository.logout() | Current session only; Idempotent |
| POST /auth/password/forgot | Request password reset email; query: —; body: ForgotPasswordRequest → GenericAccepted | PUBLIC | users,password_reset_tokens,email_logs; AuthRepository.requestPasswordReset(email) | Same response for known/unknown address; Deduped per user/window |
| POST /auth/password/reset | Consume one-time reset token; query: —; body: ResetPasswordRequest → EmptyResult | PUBLIC | password_reset_tokens,users,user_sessions,audit_logs; AuthRepository.resetDemoPassword(token,password) | Token hash and expiry required; Atomic one-time consume |
| GET /auth/me | Read safe current-user projection; query: —; body: — → UserProfile | STUDENT_OR_ADMIN | users,user_sessions; AuthSessionProvider.restoreSession() | Live session validation; Safe read |

## Student (7)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /me/dashboard | Read dashboard summary; query: —; body: — → StudentDashboard | STUDENT | users,enrollments,courses,lesson_progress; StudentRepository.getDashboard(sessionId) | No sessionId authority from browser; Safe read |
| GET /me/courses | List own course access; query: page,pageSize,status?; body: — → EnrollmentPage | STUDENT | enrollments,courses,lesson_progress; StudentRepository.listCourses(sessionId) | Owner scoped; Safe read |
| GET /me/profile | Read own profile; query: —; body: — → UserProfile | STUDENT | users; StudentAccountRepository.getProfile(sessionId) | Private fields omitted; Safe read |
| PATCH /me/profile | Update allowed profile fields; query: —; body: ProfilePatchRequest → UserProfile | STUDENT | users,audit_logs; StudentAccountRepository.updateProfile(sessionId,profile) | Allowlist fields; Idempotent patch |
| PUT /me/password | Change password; query: —; body: ChangePasswordRequest → EmptyResult | STUDENT | users,user_sessions,audit_logs; StudentAccountRepository.changePassword(sessionId,current,new) | Verify current password; Session policy applies |
| GET /me/sessions | List safe session summaries; query: page,pageSize; body: — → SessionPage | STUDENT | user_sessions; StudentAccountRepository.listSessions(sessionId) | Omit IP and raw user-agent; Safe read |
| DELETE /me/sessions/{sessionId} | Revoke one owned session; query: —; body: — → EmptyResult | STUDENT | user_sessions,audit_logs; StudentAccountRepository.revokeSession(sessionId,targetSessionId) | Current session becomes invalid; Idempotent |

## Learning (10)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /me/courses/{courseId} | Read entitled course tree and progress; query: —; body: — → StudentCourseOverview | STUDENT | enrollments,courses,course_sections,lessons,exercises,lesson_progress,exercise_progress; StudentLearningRepository.getCourseOverview | Active enrollment required;  Safe read |
| GET /learn/courses/{courseId}/sections/{sectionId} | Read section within learner course; query: —; body: — → StudentSection | STUDENT | enrollments,courses,course_sections,lessons; StudentLearningRepository.getSection | Verify ancestry; Safe read |
| GET /learn/lessons/{lessonId} | Read lesson, media metadata, exercises; query: —; body: — → LessonWorkspace | STUDENT | enrollments,lessons,lesson_assets,exercises,lesson_progress; StudentLearningRepository.getLesson | Update last-access timestamp only; Idempotent progress touch |
| GET /learn/exercises/{exerciseId} | Read exercise and authorized asset metadata; query: —; body: — → Exercise | STUDENT | enrollments,exercises,lessons,exercise_assets,media_assets,exercise_progress; StudentLearningRepository.getExercise | Answers before completion; entitlement/association required; Safe read |
| POST /learn/exercises/{exerciseId}/complete | Mark eligible manual exercise complete; query: —; body: — → ExerciseProgress | STUDENT | enrollments,exercises,exercise_progress,lessons,lesson_progress; StudentLearningRepository.completeExercise | Quiz completion is server-derived; Idempotent upsert |
| POST /learn/lessons/{lessonId}/complete | Complete lesson after required exercises; query: —; body: — → LessonProgress | STUDENT | enrollments,lessons,exercises,exercise_progress,lesson_progress; StudentLearningRepository.completeLesson | Server recomputes eligibility; Idempotent upsert |
| GET /learn/courses/{courseId}/progress | Read backend-calculated course progress; query: —; body: — → CourseProgress | STUDENT | enrollments,courses,lessons,lesson_progress; StudentLearningRepository.getProgress | No client-supplied percentage; Safe read |
| GET /learn/lessons/{lessonId}/notes | Read own lesson note; query: —; body: — → LessonNote | STUDENT | enrollments,lessons,lesson_notes; StudentLearningRepository.getLessonNote | Owner scoped; Safe read |
| PUT /learn/lessons/{lessonId}/notes | Create or replace own lesson note; query: —; body: LessonNoteRequest → LessonNote | STUDENT | enrollments,lessons,lesson_notes; StudentLearningRepository.saveLessonNote | Apply configured note length; Idempotent replacement |
| POST /learn/media-access | Issue short-lived URL for associated media; query: —; body: MediaAccessRequest → MediaAccess | STUDENT | enrollments,media_assets,lesson_assets,exercise_assets,exercises,lessons,courses; MediaViewModel.src | Exact association, ancestry, entitlement required; Short-lived; rate limited |

## Quiz (6)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| POST /learn/exercises/{exerciseId}/quiz-attempts | Create attempt with safe question snapshot; query: —; body: — → QuizAttempt | STUDENT | enrollments,exercises,quizzes,quiz_attempts; StudentLearningRepository.startQuiz | No correct keys in response; Idempotency-Key recommended to prevent duplicate starts |
| GET /learn/quiz-attempts/{attemptId} | Read own in-progress attempt; query: —; body: — → QuizAttempt | STUDENT | quiz_attempts; StudentLearningRepository.getQuizAttempt | Omit correctness and explanations; Safe read |
| PUT /learn/quiz-attempts/{attemptId}/answers/{questionId} | Save one selected option; query: —; body: SelectQuizAnswerRequest → QuizAttempt | STUDENT | quiz_attempts; StudentLearningRepository.selectQuizAnswer | Option belongs to frozen question; Idempotent per question |
| POST /learn/quiz-attempts/{attemptId}/submit | Grade on server and freeze result; query: —; body: — → QuizResult | STUDENT | quiz_attempts,exercises,exercise_progress,lesson_progress; StudentLearningRepository.submitQuiz | Never accept client score; Repeat returns same result |
| GET /learn/quiz-attempts/{attemptId}/result | Read own submitted quiz result; query: —; body: — → QuizResult | STUDENT | quiz_attempts; StudentLearningRepository.getQuizResult | Must be submitted and owned; Safe read |
| POST /learn/quiz-attempts/{attemptId}/retry | Create a new attempt from prior result; query: —; body: — → QuizAttempt | STUDENT | quiz_attempts,quizzes; StudentLearningRepository.retryQuiz | Preserve prior result; Idempotency-Key recommended because retry creates a distinct attempt |

## Commerce (7)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /checkout/quote | Read server-calculated purchase/renewal quote; query: courseId,orderType,renewalPlanId?,couponCode?; body: — → OrderQuote | STUDENT | courses,renewal_plans,enrollments,coupons; StudentCommerceRepository.getCheckoutContext | Order creation recalculates; Safe read |
| POST /coupons/validate | Validate coupon for selected product; query: —; body: CouponValidateRequest → CouponValidation | STUDENT | courses,renewal_plans,coupons,coupon_redemptions; StudentCommerceRepository.validateCoupon | Repeat at order creation; Read only |
| GET /renewals/courses/{courseId}/plans | List active plans for entitled course; query: page,pageSize; body: — → RenewalPlanPage | STUDENT | enrollments,courses,renewal_plans; StudentCommerceRepository.getRenewalPlans | Active enrollment required; Safe read |
| POST /orders | Create PENDING order with amount snapshots; query: —; body: OrderCreateRequest → OrderDetail | STUDENT | courses,renewal_plans,coupons,coupon_redemptions,orders,email_logs; StudentCommerceRepository.createOrder | No enrollment granted; Idempotency-Key + fingerprint |
| GET /orders | List own order history; query: page,pageSize,status?; body: — → OrderPage | STUDENT | orders,courses,enrollments; StudentCommerceRepository.listOrders | Owner scoped; Safe read |
| GET /orders/{orderId} | Read own order and safe payment instructions; query: —; body: — → OrderDetail | STUDENT | orders,enrollments,site_settings; StudentCommerceRepository.getOrder | Owner scoped; Safe read |
| POST /orders/{orderId}/confirm-transfer | Record transfer notice without approving; query: —; body: — → OrderDetail | STUDENT | orders,email_logs; Replaces simulateDemoPayment | Order remains PENDING; Idempotent + email dedupe |

## Admin Catalog (23)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /admin/courses | List courses including drafts; query: page,pageSize,status?,q?; body: — → CoursePage | ADMIN | courses; PDF admin CMS requirement | Admin-only fields; Safe read |
| POST /admin/courses | Create a DRAFT course; query: —; body: CourseWriteRequest → CourseDetail | ADMIN | courses,audit_logs; PDF admin CMS requirement | Unique code/slug; nonnegative price; Idempotency-Key recommended |
| GET /admin/courses/{courseId} | Read editable course fields; query: —; body: — → CourseDetail | ADMIN | courses; PDF admin CMS requirement | Admin projection; Safe read |
| PATCH /admin/courses/{courseId} | Update course metadata; query: —; body: CourseWriteRequest → CourseDetail | ADMIN | courses,audit_logs; PDF admin CMS requirement | Do not change order snapshots; Idempotent patch |
| DELETE /admin/courses/{courseId} | Soft-delete course; query: —; body: — → DeleteResult | ADMIN | courses,audit_logs; PDF admin CMS requirement | No cascade to history; Idempotent soft delete |
| POST /admin/courses/{courseId}/publish | Publish course after checks; query: —; body: — → CourseDetail | ADMIN | courses,course_sections,lessons,exercises,audit_logs; PDF admin CMS requirement | Validate publishable tree; Idempotent state set |
| GET /admin/courses/{courseId}/sections | List course sections in order; query: page,pageSize,status?; body: — → SectionPage | ADMIN | courses,course_sections; PDF admin CMS requirement | Parent scope check; Safe read |
| POST /admin/courses/{courseId}/sections | Create course section; query: —; body: SectionWriteRequest → Section | ADMIN | courses,course_sections,audit_logs; PDF admin CMS requirement | Parent must exist; status validated; Idempotency-Key recommended |
| PATCH /admin/sections/{sectionId} | Update section fields/order/status; query: —; body: SectionWriteRequest → Section | ADMIN | course_sections,audit_logs; PDF admin CMS requirement | Validate parent; Idempotent patch |
| DELETE /admin/sections/{sectionId} | Soft-delete section; query: —; body: — → DeleteResult | ADMIN | course_sections,audit_logs; PDF admin CMS requirement | No cascade; Idempotent soft delete |
| GET /admin/sections/{sectionId}/lessons | List lessons in section; query: page,pageSize,status?; body: — → LessonPage | ADMIN | course_sections,lessons; PDF admin CMS requirement | Parent scope; Safe read |
| POST /admin/sections/{sectionId}/lessons | Create lesson in section; query: —; body: LessonWriteRequest → Lesson | ADMIN | course_sections,lessons,audit_logs; PDF admin CMS requirement | Content schema remains open; Idempotency-Key recommended |
| PATCH /admin/lessons/{lessonId} | Update lesson and publication fields; query: —; body: LessonWriteRequest → Lesson | ADMIN | lessons,audit_logs; PDF admin CMS requirement | Version content after schema decision; Idempotent patch |
| DELETE /admin/lessons/{lessonId} | Soft-delete lesson; query: —; body: — → DeleteResult | ADMIN | lessons,audit_logs; PDF admin CMS requirement | No cascade; Idempotent soft delete |
| GET /admin/lessons/{lessonId}/exercises | List exercises in order; query: page,pageSize,status?; body: — → ExercisePage | ADMIN | lessons,exercises; PDF admin CMS requirement | Parent scope; Safe read |
| POST /admin/lessons/{lessonId}/exercises | Create exercise in lesson; query: —; body: ExerciseWriteRequest → Exercise | ADMIN | lessons,exercises,audit_logs; PDF admin CMS requirement | No student file submission; Idempotency-Key recommended |
| PATCH /admin/exercises/{exerciseId} | Update exercise metadata; query: —; body: ExerciseWriteRequest → Exercise | ADMIN | exercises,audit_logs; PDF admin CMS requirement | Validate completion mode; Idempotent patch |
| DELETE /admin/exercises/{exerciseId} | Soft-delete exercise; query: —; body: — → DeleteResult | ADMIN | exercises,audit_logs; PDF admin CMS requirement | No cascade; Idempotent soft delete |
| GET /admin/exercises/{exerciseId}/quiz | Read editable quiz including answer keys; query: —; body: — → QuizAdmin | ADMIN | exercises,quizzes; PDF admin CMS requirement | Admin-only correct keys; Safe read |
| PUT /admin/exercises/{exerciseId}/quiz | Replace bounded quiz definition; query: —; body: QuizWriteRequest → QuizAdmin | ADMIN | exercises,quizzes,audit_logs; PDF admin CMS requirement | Past attempts remain frozen; Idempotent replacement |
| POST /admin/media-assets/upload-intents | Create bounded media upload intent; query: —; body: UploadIntentRequest → UploadIntent | ADMIN | media_assets,audit_logs; PDF admin CMS requirement | Provider/type/size allowlist; Short lived |
| POST /admin/media-assets/{assetId}/complete-upload | Verify uploaded object and finalize metadata; query: —; body: UploadCompleteRequest → MediaAsset | ADMIN | media_assets,audit_logs; PDF admin CMS requirement | Verify uploaded bytes and type; Idempotent finalize |
| DELETE /admin/media-assets/{assetId} | Delete unused asset and object; query: —; body: — → DeleteResult | ADMIN | media_assets,lesson_assets,exercise_assets,audit_logs; PDF admin CMS requirement | Reject while referenced; Idempotent |

## Admin Management (21)

| Method and path | Purpose; query/body → response | Access | Collections; frontend operation | Validation and replay |
|---|---|---|---|---|
| GET /admin/students | Search and page Student accounts; query: page,pageSize,q?,status?; body: — → StudentPage | ADMIN | users; PDF admin operations | No hashes/session secrets; Safe read |
| GET /admin/students/{userId} | Read Student support profile; query: —; body: — → StudentAdminDetail | ADMIN | users,enrollments,orders; PDF admin operations | Minimize personal data; Safe read |
| PATCH /admin/students/{userId}/status | Block or reactivate Student; query: —; body: StudentStatusRequest → StudentAdminDetail | ADMIN | users,user_sessions,audit_logs; PDF admin operations | Blocking revokes active sessions; Idempotent state set |
| GET /admin/enrollments | Filter course entitlements; query: page,pageSize,userId?,courseId?,status?; body: — → EnrollmentPage | ADMIN | enrollments,users,courses; PDF admin operations | Filters are bounded; Safe read |
| GET /admin/enrollments/{enrollmentId} | Read entitlement and adjustment history; query: —; body: — → EnrollmentAdminDetail | ADMIN | enrollments,enrollment_adjustments,users,courses; PDF admin operations | Redact private data; Safe read |
| POST /admin/enrollments/{enrollmentId}/revoke | Revoke course access; query: —; body: EnrollmentActionRequest → EnrollmentAdminDetail | ADMIN | enrollments,enrollment_adjustments,audit_logs; PDF admin operations | Manual grant/revoke policy open; Idempotency-Key recommended per adjustment |
| POST /admin/enrollments/{enrollmentId}/restore | Restore revoked course access; query: —; body: EnrollmentActionRequest → EnrollmentAdminDetail | ADMIN | enrollments,enrollment_adjustments,audit_logs; PDF admin operations | Manual adjustment policy open; Idempotency-Key recommended per adjustment |
| GET /admin/courses/{courseId}/renewal-plans | List renewal plans; query: page,pageSize,status?; body: — → RenewalPlanPage | ADMIN | courses,renewal_plans; PDF admin commerce | Price field awaits approval; Safe read |
| POST /admin/courses/{courseId}/renewal-plans | Create renewal plan; query: —; body: RenewalPlanWriteRequest → RenewalPlan | ADMIN | courses,renewal_plans,audit_logs; PDF admin commerce | Price field awaits approval; Idempotency-Key recommended |
| PATCH /admin/renewal-plans/{planId} | Update plan price, duration or status; query: —; body: RenewalPlanWriteRequest → RenewalPlan | ADMIN | renewal_plans,audit_logs; PDF admin commerce | Historical order snapshot unchanged; Idempotent patch |
| DELETE /admin/renewal-plans/{planId} | Deactivate renewal plan; query: —; body: — → DeleteResult | ADMIN | renewal_plans,orders,audit_logs; PDF admin commerce | Preserve order references; Idempotent |
| GET /admin/coupons | List coupons and usage; query: page,pageSize,status?,q?; body: — → CouponPage | ADMIN | coupons,coupon_redemptions; PDF admin commerce | No unapproved filters; Safe read |
| POST /admin/coupons | Create coupon rule; query: —; body: CouponWriteRequest → Coupon | ADMIN | coupons,audit_logs; PDF admin commerce | 201 on create; Unique normalized code |
| PATCH /admin/coupons/{couponId} | Update coupon rule; query: —; body: CouponWriteRequest → Coupon | ADMIN | coupons,audit_logs; PDF admin commerce | Existing order snapshots unchanged; Idempotent patch |
| DELETE /admin/coupons/{couponId} | Deactivate coupon; query: —; body: — → DeleteResult | ADMIN | coupons,coupon_redemptions,audit_logs; PDF admin commerce | No hard delete; Preserve redemption history |
| GET /admin/orders | Review manual-transfer orders; query: page,pageSize,status?,transferSubmitted?; body: — → AdminOrderPage | ADMIN | orders,users,courses; PDF admin manual review | Indexed pending queue; Safe read |
| GET /admin/orders/{orderId} | Read order review context; query: —; body: — → AdminOrderDetail | ADMIN | orders,users,courses,enrollment_adjustments; PDF admin manual review | No payment-provider fields; Safe read |
| POST /admin/orders/{orderId}/approve | Approve transfer and grant/extend access; query: —; body: OrderApprovalRequest → ApprovedOrder | ADMIN | orders,enrollments,enrollment_adjustments,audit_logs,email_logs; PDF admin manual review | PENDING and transfer submitted required; CAS + transaction exactly once |
| GET /admin/site-settings | Read editable site/payment settings; query: —; body: — → SiteSettingsAdmin | ADMIN | site_settings,media_assets; PDF site settings | Payment details Admin-only; Safe read |
| PATCH /admin/site-settings | Update public/payment configuration; query: —; body: SiteSettingsWriteRequest → SiteSettingsAdmin | ADMIN | site_settings,audit_logs; PDF site settings | No seeded bank data; Idempotent patch |
| GET /admin/audit-logs | Search redacted audit history; query: page,pageSize,entityType?,entityId?,actorUserId?; body: — → AuditLogPage | ADMIN | audit_logs; PDF audit table | Paginated and redacted; Safe read |

## Contract notes

- Public course detail includes the public outline; it does not expose hardcoded A1.1 chapters. Generic preview remains future work pending an owner policy.
- Public media metadata is limited to explicitly public assets. Visibility and course-intro association are technical extensions pending schema approval.
- Order creation recalculates price and snapshots amounts. Transfer submission leaves status PENDING. Only Admin approval grants or extends enrollment.
- No payment rejection/failure endpoint, gateway callback, webhook, or payment_transactions collection is included.
- Admin quiz endpoints include answer keys; Student attempt schema does not. Historical attempts retain a frozen snapshot.
- No Admin repository exists in the current frontend; Admin endpoints derive from PDF Admin workflows.

OpenAPI paths and catalog counts are generated from one registry to keep methods, routes, role labels, body and response names aligned.
