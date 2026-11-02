# Frontend Implementation Roadmap (proposed)

This roadmap describes a future implementation order. **No implementation was started in this research task.** It depends on resolving the P0 contract questions in [14-OPEN-QUESTIONS-AND-RISKS.md](14-OPEN-QUESTIONS-AND-RISKS.md).

## Gate 0 — Contract and product decisions

Resolve first:

- Three free chapters: identify exact sections, YouTube preview source, guest access, progress/account behavior, API/schema representation.
- Student/public endpoint HTTP methods, DTOs, nullability, pagination, error details and auth requirements.
- Access matrix for course/section/lesson/exercise and paid assets, including expiration and archived content.
- Payment provider, checkout return/status mechanism, VND display and retry policy.
- Quiz results: pass threshold, answer reveal, retry rules and attempt limit.
- Coupon errors/use limits; password reset success/anti-enumeration behavior.
- Enrollment expiry/calendar-month edge cases and default/available renewal plans.

**Exit:** approved API examples/contract and product rules; no open P0 that would change primary screens or access decisions.

## Phase 1 — Foundations and design tokens

- Bootstrap only the agreed React/Vite/TypeScript frontend in a separate implementation request.
- Define route boundaries, shells, theme tokens, type/format layer, accessible primitives and global error/session boundary.
- Implement mock/HTTP repository interfaces and deterministic scenario selection.
- Deliver public and student shells, error/empty/loading patterns; validate all requested viewports.

**Exit:** agreed token/component foundations, responsive shell, demo data switches, no DB entity imported into UI.

## Phase 2 — Public discovery and preview

- Landing, help/FAQ, catalog, course detail, course outline.
- Free chapter preview using only approved content and explicit preview manifest/API contract.
- Primary tasks: understand A1.1 value, inspect outline, play preview, register or proceed to purchase.

**Exit:** guest can navigate public pages and authorized preview; unavailable preview degrades accessibly.

## Phase 3 — Authentication and account shell

- Register, login, forgot/reset password, profile and protected route experience.
- Session-revoked global response handling; clear caches/stop refresh/redirect.
- Student dashboard and my-courses empty/active/expired-derived states.

**Exit:** all auth flows use confirmed DTO/errors; second-login scenario is demonstrable without claiming push logout.

## Phase 4 — Learning and progress

- Course tree, section, lesson, media, file exercise, answer release, lesson note, progress view.
- Render current state from server/mock repositories; access gate stays server-authoritative.
- Add quiz attempt/result after answer/pass/retry contract is signed off.

**Exit:** file/quiz lifecycle matches V3 and preserves completed exercise/lesson history in mock fixtures.

## Phase 5 — Commerce and renewal

- Purchase/renewal selection, coupon validation, order summary, pending/result states and order history.
- Webhook event remains backend-owned; frontend reads resulting order/enrollment status.
- Use mock scenarios for pending/paid/failed and expired renewal. No real payment action in demo.

**Exit:** pending never unlocks; active/expired renewal date comes from backend response; correct totals displayed.

## Phase 6 — Integration and quality acceptance

- Replace mock adapter with HTTP adapter incrementally behind the same repository ports.
- Verify public/student route contracts, responsive behavior, keyboard flows, contrast, signed-media expiry and 401/403/404/409/422/429/500 paths.
- Run the later implementation team's selected unit/component/e2e and accessibility checks; confirm deployment state separately.

**Exit:** agreed API contract, design/accessibility acceptance, data integrity, no misleading access/payment state. This analysis does not imply anything has been deployed.

## Suggested priority

| Priority | Screens/capabilities | Why |
|---|---|---|
| P0 | A01, B01–B04, C01–C03, D01–D03, E01–E02, F01–F03, G01–G03 | Required guest→preview, auth, purchase, learning, exercise and quiz demo paths. |
| P1 | H01–H02, I01–I05 | Progress, notes, orders, renewal, profile and password maintenance. |
| P2 | A02, I06, additional filters/history/help | Helpful but endpoints/policies are not necessary for core demo. |

Priorities are recommendations; customer-required flows override when final acceptance scope is agreed.
