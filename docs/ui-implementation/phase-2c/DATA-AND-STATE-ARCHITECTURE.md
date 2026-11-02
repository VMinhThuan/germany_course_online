# Phase 2C — Data and state architecture

- `product-types.ts` defines learning repository inputs and view models separately from UI components.
- `product-repository.ts` composes learning state with the existing auth/session repository. Every learning operation resolves the current `sessionId` to its user and stored student state.
- TanStack Query keys include the session ID. Learning mutations invalidate the `student` query family so course, lesson, dashboard, and progress views refresh together.
- Student product state is persisted in `sessionStorage`, namespaced by user ID and versioned. Notes are indexed by lesson ID inside that user state; a different user cannot retrieve them.
- Lesson completion is derived from required exercise progress. Quiz attempts keep selected answers in the attempt record, while answer keys are only used to build a result after submission.
- Retrying a submitted quiz creates a different attempt and leaves the prior result and completed lesson progress intact.

The page layer never decides entitlement from a route or fixture status alone. It renders repository capabilities and query state.
