# Entitlement and Access Control

## Request identity

All `/api/v1/me` and `/api/v1/learn` routes use the existing BE-01 `authenticate(config)` middleware and `requireRole("STUDENT")`. Authentication verifies the access JWT and reloads its current user and session from MongoDB; BE-02 does not trust a caller-supplied `userId` or change auth/session behavior.

## Course entitlement

`EntitlementService` is the shared gate for student course and learning resource access. A request needs:

1. An active authenticated STUDENT session (BE-01 middleware).
2. An enrollment whose `userId` is the authenticated subject, `courseId` is the requested course, status is `ACTIVE`, and `expiresAt` is strictly later than the server's current time.
3. A published, non-deleted course.
4. For nested access, a published, non-deleted section, lesson, or exercise whose stored parent references match all the way to that course.

The service responds with the standard not-found result when entitlement, publication, deletion, or parent association fails, reducing resource-existence disclosure. Sections are matched by both their ID and requested course ID. Lessons and exercises resolve their stored parents before evaluating course entitlement.

## Read filtering

Course overview and section responses include published, non-deleted descendants in stable `sortOrder` order. Lesson workspace includes published, non-deleted exercises and associated assets. Draft/hidden/deleted lessons and sections are excluded. Public catalog behavior remains in the existing BE-01 catalog module.

## Student dashboard and historical enrollment reads

`GET /me/dashboard` includes only ACTIVE, unexpired enrollments. `GET /me/courses` is a paginated owner-scoped enrollment history and accepts `ACTIVE` or `REVOKED` status filtering; expiry itself remains timestamp-derived. Learning-resource routes still require a currently valid entitlement even when a historical enrollment row is listed.

## Progress independence

Progress and notes use `{userId, resourceId}` unique indexes, not a session ID. The records are not deleted or invalidated when enrollment expires; only access to the course resources and progress read APIs is gated by the current entitlement.

## Test evidence

Replica-set integration tests cover active access, missing enrollment, expiry, revocation, a cross-course section substitution, unpublished parent access, non-student role denial, and owner-scoped attempts/notes. BE-01 session revocation, token, and blocked-account tests remain in the full regression run. See [TEST-RESULTS.md](TEST-RESULTS.md).
