# Phase 2A — Product Route Map

| ID  | Route                    | Page           | Main navigation and behavior                                                                                                                |
| --- | ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | `/`                      | Public landing | Course link, preview CTA, learning section, safe FAQ anchor, final CTA.                                                                     |
| C01 | `/courses`               | Course catalog | One A1.1 card in an intentional single-column feature layout; no speculative search or filters.                                             |
| C02 | `/courses/:slug`         | Course detail  | Overview and outline. Only the three manifest chapters show a free-preview CTA. Full-course lesson actions explain that access is required. |
| C03 | `/courses/:slug/preview` | Free preview   | Guest lesson experience with chapter and lesson selection. `sectionId` and optional `lessonId` are read from the query string.              |
| 404 | `*`                      | Not found      | Branded public 404 with links to home and catalog.                                                                                          |

## Preview URL examples

- Default selection: `/courses/tieng-duc-a1-1/preview` (the page replaces the URL with its first valid chapter and lesson after data loads).
- Chapter selection: `/courses/tieng-duc-a1-1/preview?sectionId=a11-chapter-02`
- Lesson selection: `/courses/tieng-duc-a1-1/preview?sectionId=a11-chapter-02&lessonId=a11-lesson-03`
- A paid chapter, invalid section, or mismatched lesson remains a presentation state in this UI; it does not grant access.

## Routing implementation

`src/app/public-site/routes.tsx` exports the public route objects. The development app combines these with `/__dev/ui-kit`, `/__dev/lms-kit`, and `/__dev/layouts/:layout`; the production app registers only the public objects. Each application has one `BrowserRouter` and one existing `AppProviders` tree.

`ProductRouteEffects` sets top-level scroll on path pushes, preserves query-driven preview navigation, scrolls to hash targets, restores known POP positions, and leaves page titles to the route pages. Vite's SPA fallback serves deep links for direct navigation and reloads.
