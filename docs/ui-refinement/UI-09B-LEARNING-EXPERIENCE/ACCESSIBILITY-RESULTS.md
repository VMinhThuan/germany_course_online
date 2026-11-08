# Accessibility results

## Implemented

- Decorative headings retain real `h1` semantics and an accessible text name; the visible SVG paths are `aria-hidden`.
- Unsupported lettering falls back to visible semantic text.
- Accordion controls are native buttons with `aria-expanded` and `aria-controls`; links use real route destinations.
- Lesson and exercise items have separate focusable controls, avoiding nested interactive elements.
- Focus-visible styles remain on buttons and links. The chevron transition disables animation under `prefers-reduced-motion`.
- Status text and icons identify current/completed state without relying only on color.

## Automated review

The UI-09B Playwright run used axe-core on the desktop course outline and lesson workspace. It passed with no remaining axe violations after the secondary outline labels were darkened. The outline component test also verifies keyboard activation with Enter and Space.

This is a focused page-level check, not a full WCAG conformance certification of the entire application.
