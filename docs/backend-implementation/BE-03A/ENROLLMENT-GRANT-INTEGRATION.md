# Enrollment Grant Integration

Approval creates the existing BE-02 `enrollments` record with `userId`, `courseId`, `sourceOrderId`, `activatedAt`, `expiresAt`, and status ACTIVE. `expiresAt` is derived from the frozen `durationMonthsSnapshot`; a later catalog duration edit does not affect the grant.

The technical UTC month rule preserves UTC time-of-day and clamps the day to the last day of the destination month. For example, January 31 + one month becomes February 28 or 29, and February 29 + twelve months becomes February 28 in the next non-leap year. End-of-month and leap-year cases have unit coverage. This rule applies only to the initial PURCHASE grant; no renewal extension rule was enabled.

The existing unique enrollment index `{ userId: 1, courseId: 1 }` prevents a duplicate grant. If any enrollment row already exists, approval conflicts without modifying its expiry/status or progress. This is a conservative technical proposal pending owner policy for revoked or expired enrollments.

After transaction commit, BE-02 `EntitlementService` sees the ACTIVE unexpired enrollment without a cache or separate synchronization step. The integration test checked `/api/v1/me/dashboard`, `/api/v1/me/courses`, `/api/v1/me/courses/:courseId`, and a protected `/api/v1/learn/lessons/:lessonId` request before and after approval.
