# Phase 1B handoff

Phase 1A supplies the UI layer only. Before adding product screens, review the original research and confirm unresolved contracts with the product/backend owner.

## Start from the research set

- [Executive summary](../ui-research/01-EXECUTIVE-SUMMARY.md)
- [Requirements traceability](../ui-research/02-REQUIREMENTS-TRACEABILITY.md)
- [Business-rule matrix](../ui-research/05-BUSINESS-RULE-MATRIX.md)
- [Database/API/frontend mapping](../ui-research/06-DATABASE-API-FRONTEND-MAPPING.md)
- [Sitemap and screen inventory](../ui-research/07-SITEMAP-AND-SCREEN-INVENTORY.md)
- [Typed mock-data strategy](../ui-research/11-TYPED-MOCK-DATA-STRATEGY.md)
- [Frontend architecture](../ui-research/12-FRONTEND-ARCHITECTURE.md)
- [Implementation roadmap](../ui-research/13-IMPLEMENTATION-ROADMAP.md)
- [Open questions and risks](../ui-research/14-OPEN-QUESTIONS-AND-RISKS.md)
- [Design system spec](../ui-research/09-DESIGN-SYSTEM-SPEC.md) and [component inventory](../ui-research/10-COMPONENT-INVENTORY.md)

## Contract checks before implementation

1. **Confirm the Phase 1B screen slice.** The research inventory recommends 28 screens across later phases. Select concrete screens and acceptance criteria from the roadmap before implementing any business flow.
2. **Verify API method, route, DTO, nullability, and error behavior.** The research found 30 data entities but incomplete frontend mapping. Only `login_events` and `payment_webhook_events` had detailed field types/nullability in the reviewed schema. Do not infer request/response DTOs from table names.
3. **Keep course-free access explicit.** The customer requirement says the first three chapters of A1.1 are free. The reviewed model/API did not expose a preview flag. Do not reinterpret that as the first three lessons or encode a static unlock rule until the owner confirms a contract.
4. **Respect enrollment semantics.** `EnrollmentStatus` is `ACTIVE` or `REVOKED`; expiry is derived from `expiresAt`, not a third status. Confirm the API’s entitlement response before gating UI.
5. **Keep payment and order state server-owned.** No total, currency, payment status, webhook result, or order transition should be inferred in the browser.
6. **Keep visual policy consistent.** Preserve the palette and component API in [design tokens](./03-DESIGN-TOKENS.md). Use these shells as structure; add feature components under an explicitly named feature boundary.

## Suggested implementation sequence

1. Confirm screen scope, user journey, API contracts, and the open questions above.
2. Define typed API contracts and loading/error/empty states from the confirmed endpoints.
3. Build one vertical slice using the existing form, feedback, dialog, and notification primitives.
4. Add unit and browser acceptance coverage for the real user journey; scan populated and error states with axe.
5. Validate business rules against the source research and owner approval before wiring actions.

No Phase 1B product screen or API behavior has been started in this Phase 1A workspace.
