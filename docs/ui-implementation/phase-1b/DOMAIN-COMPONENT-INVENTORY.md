# Domain Component Inventory

The 74 named components below are exported through each domain's `index.ts`. Their public prop signatures live in the listed TypeScript files and accept presentation models, display values, or callbacks. They do not import Prisma/database entities or call `fetch()`.

| Group | Exported components | Source |
|---|---|---|
| Catalog and discovery (13) | `LandingHero`, `LearningBenefits`, `CourseCard`, `CourseGrid`, `CourseLevelBadge`, `CourseDetailHero`, `CourseOverview`, `CourseObjectives`, `CourseOutline`, `CourseSectionAccordion`, `CoursePricingSummary`, `FreePreviewBadge`, `FreePreviewSection` | [`catalog/components.tsx`](../../../frontend/src/domains/catalog/components.tsx) |
| Learning (11) | `LearningCourseHeader`, `CourseTree`, `ChapterItem`, `LessonRow`, `LessonStatusIndicator`, `LessonNavigation`, `LessonContent`, `LearningProgressSummary`, `AccessStatePanel`, `LockedContentPanel`, `LessonCompletionIndicator` | [`learning/components.tsx`](../../../frontend/src/domains/learning/components.tsx) |
| Media (7) | `VideoPlayer`, `AudioPlayer`, `PDFViewer`, `MediaLoadingState`, `MediaErrorState`, `MediaUnavailableState`, `MediaFallbackLink` | [`media/components.tsx`](../../../frontend/src/domains/media/components.tsx) |
| Exercises (7) | `ExerciseHeader`, `ExerciseInstruction`, `ExerciseAssetList`, `FileExercisePanel`, `ExerciseCompletionAction`, `ExerciseStatusBadge`, `ExerciseSolutionPanel` | [`exercises/components.tsx`](../../../frontend/src/domains/exercises/components.tsx) |
| Quizzes (10) | `QuizIntro`, `QuizQuestion`, `QuizOption`, `QuizQuestionNavigator`, `QuizProgress`, `QuizRunner`, `QuizSubmissionPanel`, `QuizResult`, `QuizReview`, `QuizRetryAction` | [`quizzes/components.tsx`](../../../frontend/src/domains/quizzes/components.tsx) |
| Progress and notes (7) | `CourseProgressCard`, `ProgressRing`, `LearningStatsSummary`, `ContinueLearningCard`, `LessonProgressList`, `LessonNotesEditor`, `NoteSaveStatus` | [`progress/components.tsx`](../../../frontend/src/domains/progress/components.tsx) |
| Commerce (12) | `PricingCard`, `PriceSummary`, `EnrollmentStatusCard`, `RenewalPlanCard`, `CouponField`, `OrderSummary`, `CheckoutInformationPanel`, `PaymentStatusPanel`, `OrderHistoryItem`, `PaymentPendingState`, `PaymentFailureState`, `PaymentSuccessState` | [`commerce/components.tsx`](../../../frontend/src/domains/commerce/components.tsx) |
| Account (7) | `StudentProfileCard`, `ProfileForm`, `AccountNavigation`, `SecurityNotice`, `SessionSummary`, `SessionList`, `AccountEmptyState` | [`account/components.tsx`](../../../frontend/src/domains/account/components.tsx) |

Support exports used by the showcase include `EnrollmentAccessPanel` and `AccountSecurityLinks`. `DomainState` is a shared presentation helper, not a new global UI primitive.

## Phase 1A primitives reused

`Button`, `LinkButton`, `Card` family, `Badge`, `Accordion` family, `Progress`, `FormField`, `TextInput`, `Textarea`, `InlineAlert`, `BaseDialog`, `SelectField`, and the Phase 1A spacing, color, typography, radius, and focus tokens.

## Coverage of the 28 planned screens

This table describes component coverage only; Phase 1B does not implement any of these routes as product pages. IDs and routes follow [Phase 0 Screen Inventory](../../../../ui-research/07-SITEMAP-AND-SCREEN-INVENTORY.md).

| Screens | Reusable coverage in Phase 1B | Remaining work |
|---|---|---|
| A01 `/`, A02 `/help` | Landing hero/benefits/course discovery; Phase 1A Accordion and feedback can compose help content. | Approved public copy, FAQ model, public shell route. |
| B01–B04 `/login`, `/register`, `/forgot-password`, `/reset-password` | Phase 1A AuthShell and form primitives; auth presentation state is typed. | Auth-specific product forms, validation policy, DTOs and endpoints. |
| C01–C03 `/courses`, `/courses/:slug`, `/courses/:slug/preview` | Course grid/card, detail hero, overview/objectives/outline/pricing, mock-only preview section. | Filters/pagination contract, approved preview media and production authorization source. |
| D01–D03 checkout and order result | Coupon, price/order summary, checkout information, payment state components. | Real order/payment provider flow, API contracts, retry policy. |
| E01–E02 dashboard/course list | Progress/continue cards, stats, enrollment/access presentation. | Student shell routes and confirmed dashboard response. |
| F01–F03 course tree, section, lesson | Course tree, lesson navigation/content, media, access and completion presentation. | Course/lesson endpoints and backend authorization. |
| G01–G03 exercise, quiz, result | File exercise, gated solution, quiz attempt/result/review/retry components. | Real attempt DTO, grading/result capabilities, signed media URLs. |
| H01–H02 progress and notes | Progress cards/list/ring and note editor/save states. | Progress formula contract and note endpoint/conflict behavior. |
| I01–I03 orders, order detail, renewal | Order history/detail summaries and renewal pricing cards. | Ownership rules, renewal plan DTO and server-calculated term. |
| I04–I06 profile/security/password/sessions | Profile form/card, safe session list, security notice/navigation; Phase 1A PasswordInput. | Confirmed editable profile fields, session API and password/session policy. |

