# Accessibility and visual review

## Automated accessibility

`@axe-core/playwright` passed on 10 Phase 2B views: Landing, Login, Login validation, Register, Forgot Password, Reset Password, Dashboard without enrollment, populated Dashboard, active My Courses, and expired My Courses.

During review, fixes were made for the demo account select placeholder contrast, a missing h2 before My Courses cards, and the loading skeleton's status semantics. Development controls have an accessible name so they do not create duplicate unnamed landmarks in development-only shell/showcase scans. Existing foundation, LMS, and public-site axe tests passed in the final full run.

Keyboard checks cover Login email-to-password order and validation, existing form confirmation focus restoration, and public preview navigation. The student mobile drawer opens as a named dialog and closes through navigation. The full responsive suite reports no horizontal overflow at the four specified widths.

## Visual review

Captured evidence in `screenshots/`:

- Landing and Catalog, desktop/mobile.
- Login, desktop/mobile; auth validation; Register; Forgot and Reset.
- Dashboard empty, populated, and expired; My Courses active/expired.
- Session-revoked notice and mobile student navigation drawer.

The Landing hero uses light pastel blue, keeps teal for primary actions, and the single-course catalog balances the card with supporting course facts without inventing courses. Auth screens use a light surface and split AuthShell. Student pages keep learning cards/progress rather than an enterprise analytics layout. Mobile capture was inspected after responsive rendering; the hero illustration text has adequate inset space and the menu screenshot is a viewport capture.

## Visual tool limitation

Computer Use was unavailable after its Phase 2A initialization failure (`failed to write kernel assets: The system cannot find the path specified`). Per the Phase 2A recovery, it was not retried. Chromium/Playwright captures and layout inspection were used instead; this is not reported as a Computer Use pass.
