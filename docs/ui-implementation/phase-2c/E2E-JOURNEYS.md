# Phase 2C — E2E journeys

The Playwright suite exercises these learner paths with visible UI actions:

1. Active student → course overview → chapter → lesson.
2. Edit a lesson note → save → leave → return through `#notes` → verify the saved value.
3. Complete the required file exercise → reveal its solution.
4. Start a quiz → choose one answer per question → confirm submit → review result → retry with a distinct attempt ID.
5. Compare completed lesson progress on the progress page and dashboard after quiz retry.
6. At 390 px, open the learner drawer → My Courses → learning workspace → file exercise → quiz → progress.
7. Open invalid section/order deep links, reload a valid lesson, and verify browser Back/Forward.

Existing Phase 2B tests retain coverage for guest discovery, registration, auth redirects, session revocation and request retry. Production route smoke is documented in the final integration report.
