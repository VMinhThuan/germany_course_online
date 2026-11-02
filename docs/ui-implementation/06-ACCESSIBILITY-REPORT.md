# Accessibility report

**Automated status: PASS** · axe-core Playwright 4.14.0 · Chromium

## Implemented

- Semantic `header`, `nav`, `main`, `aside`, and `footer` regions with page-level `h1` headings.
- Skip links, visible `:focus-visible` styling, and 44px minimum button/input targets for primary controls.
- Radix primitives for keyboard-managed dialogs, alert dialogs, sheets, accordions, tabs, select, menus, popovers, tooltips, checkboxes, radio groups, switches, and progress.
- Required icon-button labels; generated search IDs; associated form labels, descriptions, validation messages, `aria-invalid`, and `aria-describedby`.
- Loading state exposes `aria-busy`; toast states use status/alert roles; error summaries announce invalid forms.
- Dialog close returns focus to the initiating element. Reduced motion is honored for CSS animations and transitions.
- Pastel brand colors are backgrounds; text on them uses the dark ink token.

## Verification

Playwright ran axe against `/__dev/ui-kit` and all five layout routes at 1440×900. Result: zero violations on all six pages. Browser tests also checked keyboard-managed mobile navigation, validation announcements, dialog open/cancel behavior, focus restoration, and responsive overflow at four viewports.

Screenshots for the responsive routes and interactive states are in `screenshots/`.

## Scope limits

This is an automated baseline, not a WCAG conformance certification. Manual screen-reader testing, zoom/reflow beyond the tested viewport sizes, high-contrast mode, voice control, and browser/device combinations other than Chromium were not performed. axe ran on each route’s initial view; open overlays are behavior-tested but were not separately axe-scanned.
