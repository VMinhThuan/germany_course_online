# Frontend Architecture Recommendation

## Repository survey

**OBSERVATION, 02-11-2026:** Workspace `D:/SideProject/germany_course_online` contains empty `backend/` and `frontend/` directories. No application source, package manifest, Git metadata, framework, local architecture guidance or existing UI components were found. Preserve the V3.0 proposed stack unless the product owner changes it.

**V3.0 direction:** Frontend ReactJS + Vite + TypeScript; backend Node.js + Express + TypeScript; PostgreSQL/Prisma; REST API under `/api/v1`. This is specification intent, not currently implemented workspace behavior.

## Stack evaluation

| Technology | Fit for this project | Recommendation |
|---|---|---|
| React + TypeScript | V3 explicitly specifies it; ecosystem supports route/domain components and typed repositories. | Use for new frontend. |
| Vite | V3 explicitly specifies Vite; fast client app and mock-demo iteration. | Use as default. |
| Next.js | Could improve server rendering/SEO for landing/catalog, but V3 says Vite and no SSR requirement is stated. Adds framework/runtime decisions. | Do not switch without deciding that indexed server-rendered public pages are a requirement. Revisit if landing SEO is critical. |
| Tailwind CSS | Supports token-driven layout and responsive iteration; not prescribed by V3. | Candidate if team is comfortable; encode tokens as CSS variables and avoid raw palette drift. |
| Accessible headless primitives | Useful for drawer, accordion, dialog, menus with keyboard behavior. | Select a maintained primitive set after checking license, React version and accessibility behavior; do not use a library wholesale without review. |
| React Hook Form + Zod | Useful for typed client form state and basic input validation. Backend remains authority. | Recommended for auth/coupon/profile/quiz forms; schemas should not imply unapproved business validation. |
| TanStack Query | Fits remote server state, cache invalidation and async loading/errors. | Recommended for API query/mutation layer. Keep form and view state separate. |
| Mock Service Worker | Intercepts HTTP for browser demo, realistic request/response fixtures and later contract parity. | Recommended once API methods/DTOs are defined; repository-level fake adapters are also fine before that. |
| Vitest | Vite-compatible unit/component tests. | Candidate for later implementation acceptance; no tests were run during this analysis task. |
| Playwright | Useful cross-viewport/browser flows for auth, preview, learning and checkout mock scenarios. | Candidate for later e2e/regression; no browser tests were run as part of this analysis. |

## Architectural boundaries

| Boundary | Responsibility |
|---|---|
| app | Entry point, route table, providers, top-level error/session boundary. |
| routes/shells | PublicShell, AuthShell, StudentShell, LearningShell; route-level loading/error/404 states. |
| domains | auth, catalog, learning, progress, quiz, commerce, account; use cases/hooks/components local to domain. |
| data/contracts | API DTOs, runtime response validation (once contract exists), error envelope, mappers. |
| data/repositories | Interfaces plus mock and HTTP adapters; only layer that knows endpoint methods/URLs. |
| shared/ui | Token-based primitives and non-business controls; no DB coupling. |
| shared/format | VND/date/time/accessibility utilities; no duplicate currency or timezone handling. |

Suggested source organization, for discussion only:

~~~text
frontend/src/
  app/                 router, providers, session/error boundaries
  routes/              page composition by route
  domains/
    auth/
    catalog/
    learning/
    exercises/
    quizzes/
    progress/
    commerce/
    account/
  data/
    contracts/         DTOs and exact V3 enums
    mappers/           DTO → domain → view model
    repositories/      ports and implementations
    http/              base client, error normalization
  shared/
    ui/                accessible components
    tokens/            design tokens/theme
    format/            money, dates, locale helpers
    config/
~~~

## State ownership

- **Remote state:** TanStack Query cache keyed per domain/resource; invalidate after completion, coupon, order and profile mutations.
- **Local view state:** open drawer, accordion, selected tab, current unsaved form state. Keep near component/route.
- **Quiz answer draft:** scoped to current attempt and cleared on logout/revocation; server owns grading and persisted result.
- **Auth/session:** one small session boundary or query cache; on `SESSION_REVOKED`, stop refresh, clear protected caches, redirect to login with an accessible message.
- **Avoid:** one global store containing profile, course tree, quiz answers, order/payment, UI controls and all server data.

## Security and route boundaries

- Route guard is for user experience only. Backend middleware validates JWT, session id/status/expiry, account status and role on every protected API.
- Never trust client values for price, coupon discount, payment success, enrollment activation, quiz grading, or progress completion.
- Keep passwordHash, refreshTokenHash, media storageKey, provider secrets and quiz answer flags out of presentation types.
- Map `SESSION_REVOKED` once at HTTP boundary; prevent a retry loop with the revoked refresh token.
- Protected asset URL is short-lived; request a new URL only via authorized API, not by reconstructing storage path.

## Data flow

~~~mermaid
flowchart LR
  Page[Route page] --> Hook[Domain query/use-case]
  Hook --> Port[Typed repository interface]
  Port --> Mock[Mock repository]
  Port --> Http[HTTP repository]
  Http --> Mapper[DTO validation and mapper]
  Mapper --> VM[Domain/View model]
  Mock --> VM
  VM --> UI[Shared UI components]
~~~

Mock and HTTP adapters should have the same repository interface. Once DTO shape is agreed, components do not change when switching adapter.

## API boundary requirements

Before connecting real services, backend team should document method, path, auth, DTO, nullable fields, validation errors and pagination for each public/student route. Set `VITE_API_BASE_URL` (suggested name, not specified by V3) by environment; do not embed secrets in Vite-exposed variables. Normalize `{success,data,meta}` and `{success:false,error:{code,message,details}}` at one transport boundary.

## SSR decision

The public landing/course pages may benefit from search indexing; however, the request does not explicitly require SEO/SSR and V3 specifies React + Vite. Start with Vite unless product owner confirms indexed SEO, server-side personalization, or route metadata requirements that justify evaluating Next.js. This is a recommendation, not a requirement.
