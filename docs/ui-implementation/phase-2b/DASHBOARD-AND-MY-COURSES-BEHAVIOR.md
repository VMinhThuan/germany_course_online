# Dashboard and My Courses behavior

## E01 — `/student`

`StudentDashboardPage` reads `useStudentDashboard(session.id)` and resolves the public course through `usePublicCourse`. It uses `ProductStudentLayout` with the product-mode `StudentShell` and a safe display name.

- Welcome banner shows the fictional learner name and course count.
- A course record produces `ContinueLearningCard` only to the existing public preview route. Paid full-learning routes are not linked.
- “Khóa học của tôi” shows `CourseCard`, `AccessStatePanel`, `LearningProgressSummary`, and `EnrollmentStatusCard` from repository data.
- No-enrollment state explains that enrollment has not been activated and offers public course discovery.
- “Bước tiếp theo” offers the free preview and public catalog; it does not imply purchase or learning completion.
- Loading uses a status region and skeletons; repository failures use `ErrorState` with retry.
- Empty/progress/streak values are not fabricated; the shown lesson counts and percentage come from fixtures.

## E02 — `/student/courses`

`StudentCoursesPage` reads `useStudentCourses(session.id)` plus the public A1.1 course summary. It renders:

- empty state with discovery and free-preview links;
- `CourseCard` and `AccessStatePanel` for available, expired-display, or revoked enrollment;
- `EnrollmentStatusCard` and `CourseProgressCard` when fixture progress exists;
- expiry date and honest “Gia hạn chưa được triển khai” message for expired entitlement;
- retryable loading/error states.

Course information and free preview may be opened for all personas because they are public. No paid media or full lesson destination is exposed. Renewal remains unavailable. An enrollment record alone does not grant access: status and derived expiry are represented separately.

## Reused and added components

Reused Phase 1A primitives/layouts: `AuthShell`, `StudentShell`, `FormField`, `EmailInput`, `PasswordInput`, `SelectField`, `Button`, `LinkButton`, `InlineAlert`, `EmptyState`, `ErrorState`, `Skeleton`, `Card`, `PageHeader`, and `SectionHeader`.

Reused Phase 1B LMS domain UI: `CourseCard`, `EnrollmentStatusCard`, `AccessStatePanel`, `CourseProgressCard`, `ContinueLearningCard`, `LearningProgressSummary`, and existing course/progress view models.

Added for this phase: auth page composition (`AuthPageFrame`, `AuthFormCard`), student loading/intro/layout composition, one protected route and provider boundary, repository event handling, and a development-only scenario controller. These compose existing primitives rather than duplicate the design system.
