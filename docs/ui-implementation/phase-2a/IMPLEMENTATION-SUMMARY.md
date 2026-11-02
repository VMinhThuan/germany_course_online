# Phase 2A — Implementation Summary

## Status

Public routes and the A1.1 guest preview are implemented. The product screens share one route table between the development and production applications. The production app uses the safe public-demo repository; developer showcases and LMS fixtures remain in the development entry only.

## Delivered

- `/` landing page with course highlight, learning approach, three-chapter preview CTA, FAQ, final CTA, and public footer.
- `/courses` one-course catalog; no invented catalog filters or extra courses.
- `/courses/:slug` course overview, objectives clearly marked as demo copy, chapter/lesson outline, preview CTA, guarded full-course information, and an honest not-ready purchase dialog.
- `/courses/:slug/preview` guest learning view with chapter/lesson navigation, URL-backed selection, lesson samples, and an explicit unavailable video state.
- Shared route handling, direct links/reloads, title updates, back/forward navigation, a 404 page, and scroll behavior.
- A typed public-demo repository and use cases that contain only public course and approved preview sample data. The app does not import the Phase 1B developer repository or its student, order, payment, exercise, or quiz fixtures.
- Loading, empty, missing-content, invalid-section, restricted-section, and repository-error UI states.
- Nine Phase 2A implementation and handoff documents, with visual evidence in [screenshots](screenshots/).

## Product and data boundary

The public preview manifest lists exactly `a11-chapter-01`, `a11-chapter-02`, and `a11-chapter-03`, all validated as published `CHAPTER` sections for `tieng-duc-a1-1`. A URL query only selects the visible chapter and lesson. The data adapter independently refuses to return content for any other section. No auth, checkout, payment, or backend integration was added.

Course price and access duration are omitted from public course data and UI because neither is confirmed. The buy CTA opens a dialog saying registration and payment are not available in the demo.

## Verification

See [TEST-RESULTS.md](TEST-RESULTS.md) for the final commands and results. Screenshots were produced by Playwright at 1440×900, 768×1024, 390×844, and 320×640. The requested Computer Use visual pass could not start because the configured node-repl helper failed to write its kernel assets; the failure and fallback are documented in [ACCESSIBILITY-AND-RESPONSIVE-REVIEW.md](ACCESSIBILITY-AND-RESPONSIVE-REVIEW.md).

No backend, database, payment provider, production deployment, Git initialization, or commit was performed.
