# Information Architecture & Screen Inventory

**Phạm vi:** Public-facing/Student-facing only. Route đều là **đề xuất**; endpoint coverage theo V3. Không thiết kế Admin dashboard.

## Sitemap đề xuất

- Public: /, /help, /courses, /courses/:slug, /courses/:slug/preview
- Authentication: /login, /register, /forgot-password, /reset-password
- Checkout: /checkout/:orderContext, /orders/:id/pending, /orders/:id/result
- Student: /student, /student/courses
- Learning: /learn/courses/:courseId, /learn/courses/:courseId/sections/:sectionId, /learn/lessons/:lessonId
- Exercise/Quiz: /learn/exercises/:exerciseId, /learn/quizzes/:attemptId, /learn/quizzes/:attemptId/result
- Progress/Notes: /student/progress, /learn/lessons/:lessonId#notes
- Account/Commerce: /student/orders, /student/orders/:id, /student/courses/:courseId/renew, /student/profile, /student/security/password, /student/security/sessions

## Screen inventory

Legend: **Guest** = anonymous; **Student** = authenticated student with valid session. Access and route guards are UX hints only; backend enforces authorization. P0 = core demo/launch path; P1 = important account/retention; P2 = optional/supporting.

### A. Public Website (2 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| A01 · / · Guest/Student | Landing giới thiệu A1.1. Data: public settings, hero, course summary, proof/FAQ content được duyệt. | PublicHeader, Hero, CoursePreviewSummary, BenefitList, FAQAccordion, CTA, Footer; actions: xem khóa học, login/register. | Direct/search → A02/C01/B01. | Settings loading/error fallback; Guest/public; P0. |
| A02 · /help · Guest/Student | FAQ/help gọn, giải thích học thử, access, account; content do product duyệt. Không có support API trong V3. | HelpSearch/Accordion, ContactLink (không form nếu chưa có endpoint); actions: xem FAQ, quay catalog, login. | A01/footer → C01/B01. | Empty FAQ/content unavailable; public; P2, route có thể thành anchor của A01. |

### B. Authentication (4 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| B01 · /login · Guest | Đăng nhập; email/password (token/session DTO cần chốt). | AuthShell, EmailField, PasswordField, Submit, Forgot/Signup links; submit/login. | Header/checkout gate → B02/B03/E01/F01. | Loading, invalid input, 401/429, SESSION_REVOKED; authenticated user redirect policy OPEN; P0. |
| B02 · /register · Guest | Tạo tài khoản STUDENT; fields validation theo DTO chưa được ghi rõ. | RegisterForm, terms link if product policy exists; submit/register. | B01/CTA → B01 hoặc E01. | Loading, duplicate email conflict, validation/rate limit; public; P0. |
| B03 · /forgot-password · Guest | Yêu cầu email reset. | EmailField, Submit, confirmation panel; request reset. | B01 → B04. | Loading/validation/429; response anti-enumeration chưa định nghĩa; public; P0. |
| B04 · /reset-password · Guest with valid token | Đặt password bằng token. | NewPassword/Confirm fields, submit; reset. | Email/deep link → B01. | Invalid/expired/used token, loading/success/error; no token → B03; P0. |

### C. Course Catalog & Details (3 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| C01 · /courses · Guest/Student | Browse published courses. Data: public course cards/filter fields; pagination/filter/sort contract OPEN. | CourseGrid, CourseCard, level/price summary; open detail. | A01/header → C02. | Loading/skeleton, empty, API error; only public response; P0. |
| C02 · /courses/:slug · Guest/Student | Course detail A1.1, objectives, requirements, pricing/duration, section preview, CTA. | CourseHero, Outcomes, CourseOutline, price/access summary; preview/register/buy. | C01/A01 → C03/B01/D01. | Draft/archived handling per API; loading/404; course published for purchase; P0. |
| C03 · /courses/:slug/preview · Guest/Student | Course/chapter outline + first three chapters as free preview per CLIENT. Data marker/provider/YouTube URL not represented in V3. | PreviewOutline, FreeChapterBadge (presentation only), approved YouTube embed, paid CTA. | C02 → F02/B01/D01. | Preview loading/media failure; backend permission unknown; must not label paid/locked; P0 product requirement, integration OPEN. |

### D. Checkout & Enrollment (3 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| D01 · /checkout/:orderContext · Student | Review purchase/renewal, coupon, total and payment initiation. Data: course/renewal plan, VND price, duration, coupon response. | CheckoutSummary, CouponField, TermsControl only if approved policy, PaymentMethod placeholder only after provider chosen; submit order. | C02/I03 → D02/D03. | Loading, coupon invalid, 409/422, unavailable/paid already; login required; P0 purchase, P1 renewal. |
| D02 · /orders/:id/pending · Student | Explain payment/order awaits provider webhook; PENDING gives no access. | PendingStatus, order summary, check status link/refresh if API exists. | D01/payment redirect → D03/E02. | Pending/loading, timeout; protected ownership check; do not promise access; P0. |
| D03 · /orders/:id/result · Student | Display PAID/FAILED/CANCELLED/EXPIRED from server. | PaymentResult, amount/order reference, continue to course or retry CTA when allowed. | D02/provider return → E02/F01/D01. | Error/not found; 401/403; only webhook-confirmed PAID means enrollment; retry semantics OPEN; P0. |

### E. Student Dashboard (2 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| E01 · /student · Student | Resume learning and summarize current access. Data: profile safe subset, active courses, progress, orders maybe. | StudentShell, ContinueLearning, CourseAccessCard, summary; open course/orders. | Login/payment → E02/F01/I01. | Loading, no enrollment empty state, expired status from dates, 401/session revoked; auth; P0. |
| E02 · /student/courses · Student | List active/revoked/expired-derived enrollments and continue/renew. | EnrolledCourseList, ProgressBar, AccessState, RenewalCTA; open course/renewal. | E01/header → F01/I03. | Loading/empty/error; expired derived from expiresAt, status enum remains ACTIVE/REVOKED; auth; P0. |

### F. Learning Experience (3 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| F01 · /learn/courses/:courseId · Student | Navigate course tree. Data: sections, lessons, exercise summaries, access/progress. | CourseTree, SectionGroup, LessonRow, ProgressSummary; select section/lesson. | E01/E02 → F02/F03. | Loading/empty/error; enrollment/access enforced server-side; expired paid content blocked, history retained; P0. |
| F02 · /learn/courses/:courseId/sections/:sectionId · Student/Guest preview | Show CHAPTER or EXAM_PREP contents; free chapter preview must be visibly preview, not paid lock. | SectionHeader, LessonList, AccessState, PreviewPlayer/BuyCTA; choose lesson. | C03/F01 → F03/G01/D01. | Not found/hidden/locked only when server provides; guest access to preview OPEN; P0. |
| F03 · /learn/lessons/:lessonId · Student/Guest preview if allowed | Lesson content/media and manual completion when eligible; lesson notes surface. | LessonContent, MediaPlayer, PDFViewer, ExerciseList, CompleteLesson, LessonNotes; next lesson. | F01/F02 → G01/F02. | Loading/media error/403; expired loses paid video/docs but history remains; manual complete only when no required exercise per V3; P0. |

### G. Quiz & Exercises (3 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| G01 · /learn/exercises/:exerciseId · Student | FILE_BASED prompt, instructions, QUESTION_PDF/QUESTION_AUDIO, completion and later solutions. | ExerciseHeader, PDFViewer, AudioPlayer, MarkComplete, SolutionPanel; open/complete exercise. | F03 → G03/F03. | Before completion hide answer; after completion fetch endpoint for only same exercise; signed URL error/retry; auth/enrollment; P0. |
| G02 · /learn/quizzes/:attemptId · Student | Quiz attempt using server-issued questions/options without isCorrect. | QuizProgress, SingleChoiceQuestion, SubmitConfirm; select/submit. | F03/G03 → G03. | IN_PROGRESS, loading, validation, submit error, revoked session; no correct answer leakage; auth; P0. |
| G03 · /learn/quizzes/:attemptId/result · Student | Show saved server result and allow new attempt if backend allows. | ScoreSummary, AnswerReview (only if API says), RetryCTA; review/return. | G02 → F03/G02. | Pending/loading, result error; pass threshold/showCorrectAnswers/attempt cap OPEN; P0. |

### H. Progress & Notes (2 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| H01 · /student/progress · Student | Course/lesson completion from server formula. | CourseProgressCard, LessonHistory, ContinueCTA; open course. | E01/E02 → F01. | Loading, no progress; zero eligible denominator behavior OPEN; auth; P1. |
| H02 · /learn/lessons/:lessonId#notes · Student | One personal note per user/lesson. | LessonNotesEditor, SaveStatus; create/update note. | F03 → F03. | Loading/unsaved/error/conflict; unique user+lesson; auth; P1. |

### I. Orders, Renewal & Account (6 screens)

| ID · route · role | Mục đích / required data | Components / actions | Entry → next | States / access / priority |
|---|---|---|---|---|
| I01 · /student/orders · Student | List own orders. Data: orderCode, snapshots, amount/status/date. | OrderList, StatusBadge, OrderLink; open detail. | E01/header → I02. | Loading/empty/error/pagination contract OPEN; auth; P1. |
| I02 · /student/orders/:id · Student | Own order receipt/detail; never expose payment provider secrets. | OrderDetail, AmountBreakdown, PaymentState; pending/result navigation. | I01/D03 → D02/D03. | 404/403/pending; ownership required; P1. |
| I03 · /student/courses/:courseId/renew · Student | Choose ACTIVE renewal plan and inspect new term calculation. | RenewalPlanCard, ExpirySummary, ContinueCTA; select plan. | E02/F01 expired state → D01. | No plans/error; valid enrollment; backend computes oldExpiry+months or paidAt+months; P1. |
| I04 · /student/profile · Student | View/edit allowed profile fields. | ProfileForm, Email/status info; save changes. | Student shell → I05. | Loading/validation/conflict; role immutable and passwordHash never present; P1. |
| I05 · /student/security/password · Student | Change password. | Current/New/Confirm password fields; submit. | I04/security → B01 or I06. | Loading/validation/401/429; session revoke behavior after change must follow V3; P1. |
| I06 · /student/security/sessions · Student | Inspect/revoke own sessions if product exposes route; single-session policy means normally one ACTIVE. | SessionSummary, Revoke control (only if allowed); inspect/revoke. | I04/security → B01. | Empty/revoked/error; exact session list contract; auth; P2. |

## Count

| Group | Screens |
|---|---:|
| A Public Website | 2 |
| B Authentication | 4 |
| C Course Catalog & Details | 3 |
| D Checkout & Enrollment | 3 |
| E Student Dashboard | 2 |
| F Learning Experience | 3 |
| G Quiz & Exercises | 3 |
| H Progress & Notes | 2 |
| I Orders, Renewal & Account | 6 |
| **Tổng** | **28** |

## Access note

“Locked”, “free preview”, “expired” trong các dòng trên là presentation concepts. V3 chỉ định nghĩa enums cho course/content/enrollment/progress, cùng expiresAt-based expiry rule. UI must use explicit API access information and never decide authorization locally.
