# Test results

**Final status: PASS** · Run 2026-11-02 · Windows · Node 22.18.0

## Commands and results

| Command                  | Result                                    |
| ------------------------ | ----------------------------------------- |
| `npm run typecheck`      | PASS, strict TypeScript project build     |
| `npm run lint`           | PASS, ESLint with no warnings             |
| `npm test`               | 5 files, 10 tests passed                  |
| `npm run build`          | PASS, Vite production bundle built        |
| `npm run format:check`   | PASS, all matched files formatted         |
| `npm run e2e`            | 8 Chromium tests passed                   |
| `npm run e2e:production` | 1 Chromium production preview test passed |
| `npm audit`              | 0 vulnerabilities                         |

`npm run check` runs typecheck, lint, Vitest, and build in sequence; it completed successfully.

## Unit coverage

- Button loading/disabled/`aria-busy` state.
- Accordion open behavior and pagination callbacks/boundaries.
- Password visibility toggle and React Hook Form/Zod validation ARIA wiring.
- Toast display and dismiss behavior.
- Confirmation dialog open/cancel behavior.
- Date and currency formatting.

## Browser coverage

- UI kit viewport and horizontal overflow checks: 1440×900, 768×1024, 390×844, 320×640.
- Public, Auth, Checkout, Student, and Learning previews at 1440×900 and 390×844.
- Mobile public navigation sheet open, route navigation, and close.
- Invalid form messages, summary, dialog state, and focus restoration.
- axe scans of six route entry states.
- Production preview fallback, absence of dev UI markers, and showcase strings excluded from the production entry bundle.

## Screenshots

17 PNGs are stored in [`screenshots/`](./screenshots/):

- UI kit: `ui-kit-1440x900.png`, `ui-kit-768x1024.png`, `ui-kit-390x844.png`, `ui-kit-320x640.png`.
- Shells: desktop and mobile captures for public, auth, checkout, student, and learning.
- States: `public-mobile-navigation-open.png`, `form-validation-desktop.png`, `confirmation-dialog-desktop.png`.

The screenshots were captured from Chromium using Playwright after the final UI adjustments.
