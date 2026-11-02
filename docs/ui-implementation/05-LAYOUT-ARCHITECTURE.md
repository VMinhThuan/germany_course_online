# Layout architecture

## App boot sequence

`src/main.tsx` loads `index.css`, checks the root element, and selects the application entry using Vite’s compile-time `import.meta.env.DEV` value. Development dynamically imports `app/App.tsx`; production dynamically imports `app/ProductionApp.tsx`. This keeps the showcase, preview screens, and their component modules out of the production bundle.

The dev app wraps routes with `AppErrorBoundary`, `AppProviders`, and `BrowserRouter`. `AppProviders` creates one TanStack QueryClient, then installs global notification and dialog providers. No query functions or API calls are defined.

## Shared shells

| Shell           | Structure and responsive behavior                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PublicShell`   | Preview notice, sticky brand/navigation header, mobile navigation sheet, page main landmark, footer.             |
| `AuthShell`     | Preview/header band, centered content region with bounded width, footer note.                                    |
| `CheckoutShell` | Back/brand header, main content with optional side summary; side summary becomes a lower block on small screens. |
| `StudentShell`  | Desktop sidebar plus content toolbar; mobile sidebar becomes a left sheet.                                       |
| `LearningShell` | Course outline sidebar on wide screens, left sheet on mobile, sticky lesson header, main lesson region.          |

`LayoutPreviewIntro`, `ShellPlaceholder`, and `CheckoutSummaryPlaceholder` are structural preview helpers, not product page components.

## Routes

| Route                     | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `/`                       | Development redirect to `/__dev/ui-kit`.        |
| `/__dev/ui-kit`           | 14-section interactive component showcase.      |
| `/__dev/layouts/public`   | Public shell sample.                            |
| `/__dev/layouts/auth`     | Auth shell geometry sample.                     |
| `/__dev/layouts/checkout` | Checkout shell content/summary geometry sample. |
| `/__dev/layouts/student`  | Student shell sample.                           |
| `/__dev/layouts/learning` | Learning shell and lesson-content sample.       |

The production app has no router and displays a foundation status screen for all paths. The production Playwright test verifies both the fallback and that showcase markers are absent from the entry bundle.

## Suggested source boundaries

- `src/app`: composition, providers, entry-level fallback, and development previews.
- `src/shared/tokens`: semantic styles.
- `src/shared/ui`: generic controls and display primitives; no course or commerce domain rules.
- `src/shared/layouts`: page structure and navigation.
- `src/shared/lib`: pure display utilities.
- Feature modules should be added in a later phase only after their data contracts and user flows are confirmed.
