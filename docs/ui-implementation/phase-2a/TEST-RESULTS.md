# Phase 2A — Test Results

**Result: PASS** for the requested local Phase 2A gates. These results describe the local workspace and production build; they do not establish deployment readiness on a hosted environment.

| Command                  | Result       | Evidence                                                                                                                              |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`          | PASS         | TypeScript, ESLint, 62 Vitest tests across 11 files, and Vite production build.                                                       |
| `npm run format:check`   | PASS         | All matched source, E2E, and root config files use Prettier style.                                                                    |
| `npm run e2e`            | PASS — 26/26 | Chromium development suite; includes existing Phase 1A and Phase 1B coverage plus Phase 2A route and state coverage.                  |
| `npm run e2e:production` | PASS — 1/1   | Built production app serves public routes and deep links; development showcase/scenario strings are absent from the loaded JS bundle. |
| `npm audit`              | PASS         | 0 vulnerabilities reported.                                                                                                           |

## Phase 2A coverage

- A01, C01, C02, and C03 direct routes at 1440×900, 768×1024, 390×844, and 320×640; no horizontal document overflow.
- Route title changes, safe loading state, chapter/lesson query state, direct reload, browser Back/Forward, and scroll restoration.
- Keyboard activation for the outline and public navigation, dialog Escape/focus return, mobile chapter selector and mobile navigation sheet.
- Paid chapter guard, invalid slug, invalid section, lesson outside selected section, missing lesson fixture, unavailable media, and not-ready purchase dialog.
- Axe checks on all public routes and the mobile navigation state; the existing Phase 1A/1B E2E axe checks also ran.
- Unit tests validate the three-ID manifest, duplicate/cross-course/non-chapter rejection, slug and query handling, the no-paid-content call guard, missing content, safe public-only fixtures, query loading, and query errors.

## Production bundle check

The build emits the `ProductionApp` production chunk and the production smoke test checks loaded JavaScript for the Phase 1A UI-kit headline, `MOCK_SCENARIO_FIXTURES`, `anonymous_guest`, the developer scenario controller, and the developer response repository control. No backend or production host was used.

## Visual evidence

Playwright captured the four product routes at each requested viewport and interaction/state screenshots in [screenshots](screenshots/). The default C01 screenshots wait for the course card to load; [catalog-loading.png](screenshots/catalog-loading.png) separately records the loading state.

The requested Computer Use tool could not initialize: `failed to write kernel assets: The system cannot find the path specified`, including after the documented reset/retry. Chromium screenshots, computed style inspection, route E2E, and axe were used as the fallback. This does not count as a successful Computer Use run.
