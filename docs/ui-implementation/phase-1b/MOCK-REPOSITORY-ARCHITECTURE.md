# Mock Repository Architecture

## Port

`src/data/mock/repository.ts` exports `LmsRepository` and `createMockRepository(scenario, options)`. Operations are async and cover course catalog/detail/access/tree/lesson, exercises, quiz attempt/submit, course progress, lesson note read/save, coupon validation, orders, enrollment, profile, and safe sessions.

Components receive props/callbacks. They do not import the repository. The developer showcase composes the port and owns request state. There is no `fetch()` call or global data store.

## Response modes and errors

- `success`: return cloned deterministic fixture data.
- `empty`: return an empty list/null for collection/optional reads.
- `network-error`: throw a network-kind `MockRepositoryFailure`.
- `api-error`: throw a preserved status/envelope for 401, 403, 404, 409, 422, 429, or 500.

The known envelope shape is `{ success: false, error: { code, message, details: null } }`. Caller-supplied error codes are preserved. When simulating only a generic HTTP status without a confirmed V3 code, the envelope code is an empty string and the showcase labels it as unconfirmed; no endpoint-specific error code was invented.

## Determinism and isolation

- `ScenarioClock` is injectable; the default demo clock is fixed at `2026-11-02T08:00:00Z`.
- Each repository instance clones its fixture and keeps note/profile/exercise mutations in its own closure.
- Optional artificial latency supports visible loading states; default repository calls use zero delay.
- Repository errors and stateful responses are repeatable for the same scenario/options.

## Payment and access

The student-facing checkout presentation does not create an order or set payment success. The top-level scenario selector and explicit `payment_pending` / `payment_confirmed` buttons are marked developer-only. PENDING has no enrollment fixture and returns restricted access. Only the separately selected confirmed fixture contains both PAID/SUCCESS order data and ACTIVE enrollment. A paid order alone does not cause the component to infer access.

## Quiz and exercise transitions

- Quiz submission accepts the selected-answer map but returns a separately supplied result fixture; no grading is performed in the UI or start model.
- Exercise completion is a mock repository mutation. The response explicitly returns `COMPLETED` and `canViewSolutions`; the component does not grant access on its own.
- Solution assets are attached to the single fixture exercise and only rendered after the returned capability allows review.

## API integration handoff

Before adding a real adapter: confirm endpoint/method/DTO/error details, validate the response at the network boundary, write dedicated DTO-to-model mappers, keep presentation models stable, and remove development scenario tooling from the production entry. Confirm signed URL lifetime/provider and entitlement semantics first.

