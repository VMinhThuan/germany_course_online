# Audit and Security

## Audit API

`GET /api/v1/admin/audit-logs` requires ADMIN and supports page/pageSize plus entity type, entity ID, actor user ID, and inclusive ISO time bounds. Results sort newest first with `_id` as a stable tie-breaker. The query caps a page at 100 entries.

The response selects only actor/action/entity/time and a bounded `changedFields` list. It does not return old/new snapshots, IP addresses, refresh credentials, password hashes, payment settings, or user agents. BE-03B mutations write append-only audit records inside the transaction with the business change.

## Authorization and validation

- The admin router authenticates and enforces ADMIN before every `/admin` endpoint.
- Account routes enforce STUDENT and scope profile/session access to the authenticated subject.
- Zod strict objects reject unknown keys and protect immutable fields.
- MongoDB transactions protect multi-document updates, audit writes, session revocation and media-reference invariants.
- Duplicate course identifiers map to 409; malformed IDs and validation failures use the standard error envelope.
- Public course and media reads omit unpublished, soft-deleted and non-ready content.

## Sensitive-data review

Admin DTOs explicitly select safe User, Order and Enrollment fields. Quiz answer keys are only returned from ADMIN routes; Student-facing BE-02 behavior remains covered by the existing regression suite. Signed upload URLs are returned only at upload-intent creation. Storage keys/provider IDs and session secrets remain excluded from API responses.
