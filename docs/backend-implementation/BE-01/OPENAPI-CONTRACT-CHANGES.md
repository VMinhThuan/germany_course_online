# OpenAPI Contract Changes

The canonical BE-00 source is [`docs/backend-design/BE-00/openapi.yaml`](../../backend-design/BE-00/openapi.yaml). The runtime documentation copy is [`backend/openapi.yaml`](../../../backend/openapi.yaml); `npm run check:openapi` verifies they remain byte-for-byte synchronized.

## Corrections applied

1. **Single success envelope:** `AuthResult` is now the inner `{ accessToken, expiresIn, user }` payload. Login and refresh wrap it once in `{ success, data }`.
2. **Registration:** the 201 response `data` references `UserProfile`; registration creates a Student but no session. This behavior is marked **PROPOSED** in the contract-change register until product approval.
3. **Empty/generic responses:** `EmptyResult` is an empty data object and `GenericAccepted` contains only `message`. They no longer include their own `success`/`data` fields when wrapped by an operation response.
4. **Public outline:** `CourseDetail.sections` references `PublicCourseSection`; lessons reference `PublicLessonSummary` with explicit fields and no content/answer-asset fields.
5. **Catalog query:** pagination is optional with defaults matching the API; `q` and `level` have bounds; `sort` has the supported allowlist and a stable default.
6. **Request bounds:** auth password and reset-token constraints now match Zod validation.
7. **Error envelope:** `details` is an array of structured issue entries, and `requestId` is required.
8. **Cookie note:** OpenAPI states HttpOnly behavior and clarifies Secure is required in production.

## Explicitly unchanged

The public media URL remains optional. The implementation returns safe metadata only and does not add a file-delivery scheme. Student learning, quiz, enrollment, order, payment, and Admin CMS contracts remain outside this phase and were not rewritten.

## Validation evidence

`npm run check:openapi` parses OpenAPI 3.1, resolves 821 internal references, checks the 11 BE-01 operations, validates auth response payload nesting, checks the public section schema, and verifies the copy is synchronized. The contract test suite repeats the key shape assertions.
