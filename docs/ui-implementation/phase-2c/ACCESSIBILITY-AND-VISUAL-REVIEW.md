# Phase 2C — Accessibility and visual review

Playwright axe scans cover course overview, chapter, lesson workspace, file exercise, quiz introduction, quiz in progress, quiz result, progress and invalid-section recovery. E2E also exercises the quiz submit alert dialog and a mobile drawer journey. Existing foundation tests verify keyboard navigation and focus restoration in shared dialogs.

Responsive overflow checks use 1440 × 900, 768 × 1024, 390 × 844 and 320 × 640. Evidence screenshots are stored in `screenshots/`: lesson workspace, file exercise, quiz in progress and progress. The quiz introduction and page-level headings use an explicit semantic hierarchy; course/lesson complementary landmarks have distinct accessible names.

Automated axe results are a focused accessibility check, not a WCAG conformance claim. Manual screen-reader testing remains a release task.
