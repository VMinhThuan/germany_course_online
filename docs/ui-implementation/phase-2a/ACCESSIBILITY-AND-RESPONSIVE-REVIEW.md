# Phase 2A — Accessibility and Responsive Review

## Browser sizes

The four public routes were checked at 1440×900, 768×1024, 390×844, and 320×640. The `public-site.spec.ts` test asserts no horizontal document overflow and captures full-page screenshots. Added focused captures cover the expanded outline, mobile chapter selection, mobile menu, loading state, invalid query error, content-empty state, and restricted section.

Key evidence is in [screenshots](screenshots/):

- [Landing at 1440×900](screenshots/home-1440x900.png)
- [Catalog at 390×844](screenshots/catalog-390x844.png)
- [Expanded course outline](screenshots/course-detail-expanded-chapter.png)
- [Preview at 1440×900](screenshots/preview-1440x900.png)
- [Preview on mobile](screenshots/preview-mobile-chapter-selected.png)
- [Paid section restricted state](screenshots/preview-paid-section-restricted.png)
- [Loading state](screenshots/catalog-loading.png)
- [Invalid section state](screenshots/preview-invalid-section-error.png)
- [Missing lesson content](screenshots/preview-content-empty.png)

## Accessibility behavior

- Skip link and named main/navigation landmarks are retained from Phase 1A.
- Public routes use real links for navigation, a labeled native chapter selector on mobile, and the existing accessible sheet/dialog primitives.
- Query navigation supports keyboard link activation; lesson accordions remain Radix-backed.
- Purchase dialog returns focus to its trigger. Video unavailability is announced through the existing domain status component.
- Axe runs across all public routes and the mobile menu state. Existing Phase 1A/1B axe coverage remains in the same development E2E run.

## Review findings fixed

- Added `text-white` to the landing hero heading after computed-style review found the global heading color overrode the dark hero's inherited text color.
- Added `min-w-0` to the course detail grid item after the 390px/320px overflow checks found a 443px min-content column.
- Changed the active lesson duration text to the higher-contrast secondary ink color after axe measured 4.44:1 on the selected blue surface.
- Added screen-reader text for the compact mobile footer brand link.
- Added a single-column mode for one-course catalog cards so the only card does not become a narrow third of a grid.

## Computer Use constraint

The requested Computer Use visual pass was attempted. The bundled `mcp__node_repl` helper returned `failed to write kernel assets: The system cannot find the path specified` on initialization and again after reset. Per the Computer Use recovery instructions, no further Windows UI automation was attempted. The actual app was instead rendered in Chromium at the listed viewports, inspected through computed browser styles, and captured by Playwright. This limitation is recorded rather than claiming a Computer Use pass.
