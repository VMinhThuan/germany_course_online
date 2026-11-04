# BE-02 Handoff

BE-01 supplies the runtime foundation and public/auth APIs only. BE-02 has not been started.

## Reuse

- Build on `src/app.ts`, `src/server.ts`, `src/config/env.ts`, the Mongo connection/transaction helpers, request validation, centralized errors, safe logging, and shared response envelope.
- Use `authenticate(config)` for protected routes and `requireRole(...)` for role restrictions. `req.auth` is populated only after JWT plus current Mongo user/session validation.
- Add module routes beneath `/api/v1`. Add corresponding response schemas and operations to `docs/backend-design/BE-00/openapi.yaml`, copy to `backend/openapi.yaml`, then update the contract tests.
- Add Mongoose schemas and indexes deliberately; never use `syncIndexes()` or cascade deletion without an approved lifecycle.
- Keep integration tests on a disposable replica set for all transaction behavior. Preserve test database loopback/name safeguards.

## Decisions before implementation

1. Choose the supported storage provider, public/private object URL behavior, upload limits, and signed URL duration before adding media delivery.
2. Configure production MongoDB replica set, database name, managed JWT secret, allowed frontend origins, cookie policy, SMTP, and password reset URL.
3. Approve an audited Admin bootstrap operation; do not add public Admin registration.
4. Decide retention/deletion policies for login IP/user-agent data and any new audit records.
5. Confirm whether BE-02 includes course enrollment checks, lesson-content DTO schema, progress lifecycle, or quiz APIs; do not infer open quiz rules from field names.

## Suggested next module boundaries

- If the next authorized phase is learner access, add enrollment/entitlement and lesson/media association models first; validate parent course, publication, ownership, and expiry server-side.
- Keep paid-media delivery separate from the public metadata endpoint. Do not return storage keys or use `PUBLIC` visibility alone as authorization for enrolled content.
- Define lesson content as an explicit versioned public/student DTO before exposing the hidden `lessons.content` field.
- Add audit and privacy rules before Admin writes; no Admin CMS routes exist in BE-01.

## Operational gate

Before a production release, provision and verify the approved MongoDB target and indexes, real SMTP, secret management, HTTPS cookie configuration, CORS origins, Admin bootstrap, and media behavior. Local tests and the current build do not prove those production integrations.
