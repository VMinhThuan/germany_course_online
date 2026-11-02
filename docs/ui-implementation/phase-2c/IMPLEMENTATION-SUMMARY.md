# Phase 2C — Learning experience

Implemented the student learning workspace on the existing `StudentShell` and `StudentDemoRepositories` composition. Course overview and chapter pages expose the A1.1 mock tree; lessons combine entitlement state, available media fallbacks, required exercises, notes, and lesson navigation. File exercises reveal only their own solution after completion. Quiz attempts support `SINGLE_CHOICE`, answer submission, result review, and a new retry attempt. Progress is calculated once in the repository and reused by the lesson, course, progress page, and dashboard.

The active-enrollment **Khóa học của tôi** card now has a direct **Vào không gian học** action. The `#notes` anchor returns to the lesson note editor. The mobile journey uses the learner navigation drawer and reaches a completed quiz and progress view.

Implementation centers on `frontend/src/app/student-lms/learning-pages.tsx`, `frontend/src/data/student-demo/product-repository.ts`, and the typed repository/query modules. No backend or database code changed.
