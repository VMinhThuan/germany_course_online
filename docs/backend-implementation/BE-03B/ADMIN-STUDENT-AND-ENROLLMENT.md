# Admin Student and Enrollment APIs

## Student operations

- `GET /api/v1/admin/students` supports case-insensitive name/email search, status filtering and bounded pagination.
- `GET /api/v1/admin/students/{userId}` returns a safe profile plus bounded enrollment and order summaries.
- `PATCH /api/v1/admin/students/{userId}/status` accepts only `ACTIVE` or `BLOCKED`; blocking revokes all active sessions in the same transaction.

The list and detail queries are ADMIN-only and exclude password hashes, reset tokens and session credentials. Student role is verified on detail/status writes. Reactivating an account does not restore old sessions; the Student must authenticate again.

## Read-only enrollment operations

- `GET /api/v1/admin/enrollments` filters by Student, course and `ACTIVE`, `REVOKED`, or derived `EXPIRED` status.
- `GET /api/v1/admin/enrollments/{enrollmentId}` returns the safe summary and at most 100 adjustment records.

Expired means a persisted `ACTIVE` enrollment whose `expiresAt` is at or before the service clock. The ACTIVE filter excludes expired records. The API exposes source-order summary and adjustment history but does not grant, revoke, restore or renew an enrollment.
