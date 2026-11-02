# Phase 2C handoff

## Starting point

Phase 2B is a complete frontend-only demonstration with six auth/student screens, one protected route boundary, typed repositories, safe A1.1 data, and passing local/production smoke tests. The current mock adapter can be replaced through the `StudentDemoRepositories` composition point.

## Contract decisions required before live integration

Confirm with backend/product owners:

1. Registration fields, password policy, email verification, duplicate-email response, and whether new registration signs in.
2. Login/refresh/logout request and response DTOs; session identity shape; secure cookie versus bearer-token handling; refresh rotation and `ONE_ACTIVE_SESSION` semantics.
3. Exact `GET /api/v1/auth/me` session status and behavior for `401` invalid versus `401 SESSION_REVOKED`.
4. Forgot/reset anti-enumeration response, token transport, expiry/used-token codes, and rate-limit behavior.
5. Student dashboard/enrollment/progress response shapes, expiry timezone semantics, revoked-enrollment presentation, and what routes/assets are allowed for each access state.
6. Whether students can manage/revoke their own sessions and which device/session fields are safe to display.

The V3 outline specifies `UserRole.STUDENT | ADMIN`, single active session, refresh rotation, server-side validation, and `SESSION_REVOKED`; the complete frontend DTO/security contract was not available for this phase.

## Recommended next steps

- Freeze API contracts and error envelope first.
- Add an HTTP-backed adapter behind `AuthRepository`/`StudentRepository`; keep the mock adapter for story/demo use.
- Move authorization decisions to backend endpoints and verify paid media remains inaccessible when enrollment is expired/revoked.
- Add contract tests for real status codes, reload/session restore, refresh rotation, reset flow, and cross-device/session invalidation.
- Revisit registration persistence and reset UX only after agreed DTOs and security behavior are implemented.

Do not expand Phase 2B with full lessons, quizzes, checkout, payment, renewal, or Admin screens before the relevant phase and contracts are approved.
