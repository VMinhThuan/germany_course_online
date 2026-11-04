# Admin Enrollment Lifecycle

All four operations are ADMIN-only and require a nonempty reason plus an `Idempotency-Key` with an associated request fingerprint. A replay with the same key and same request returns the original enrollment; using the same key for a different action or payload conflicts. Each committed mutation appends an `enrollment_adjustments` row and an audit event in the same transaction. Email outbox records are also queued for student-facing changes.

- **GRANT** creates one ACTIVE Enrollment for a published course and active Student, with an initial UTC calendar-month expiry. Existing enrollment or unresolved pending PURCHASE is rejected. It creates no Order.
- **REVOKE** changes an ACTIVE enrollment to REVOKED, preserving expiry and learning history.
- **RESTORE** returns a REVOKED enrollment to ACTIVE. When the stored expiry is already elapsed, the Admin must explicitly supply `extensionMonths`; the service moves expiry from the current time by that duration.
- **EXTEND** adds the requested duration to `max(now, stored expiry)` using the UTC month clamp. A REVOKED enrollment must be restored first. This operation is recorded as a `RENEW` adjustment and does not create an Order.

The unique `(userId, courseId)` enrollment remains the single entitlement record. No Quiz attempt, lesson note, or progress row is deleted by these actions.
