# BE-02 Security Review

## Implemented protections

- `/me` and `/learn` use BE-01 JWT + active Mongo session/user validation and STUDENT role checks.
- Every resource route derives the student ID from authenticated claims. Enrollment, notes, progress, and attempts are queried with that owner ID.
- Entitlement verifies ACTIVE status, strict future expiry, published/non-deleted parents, and stored ancestry at each hierarchy edge. Unauthorized or unavailable resources return not found.
- Input uses strict Zod schemas for ObjectIds, pagination, note content, answer selection, media association, and idempotency keys.
- Answer media requires exact association and media-role/type compatibility after the enrollment and ancestry checks. A public asset flag alone does not grant access.
- Private provider configuration and storage keys are selected explicitly only inside the media access service and are not included in DTOs. Unexpected provider failures are converted to generic 503 errors.
- Quiz attempt reads and writes are owner-scoped. Server grading uses frozen correctness data; no answer key or explanation appears in start, read, or answer-save responses. Transactional submission protects the final score from client input and concurrent writes.
- Lesson content is explicitly selected after entitlement and passed through a bounded sanitizer. Personal notes have a unique owner/resource key.
- No credentials, URI, cloud resource, production enrollment, or sample customer data were added.

## Verification

Replica-set integration tests check cross-user/cross-course access, expiry/revocation, quiz ownership and disclosure, safe media signing, no storage-key leakage, and absent-provider behavior. Full OpenAPI validation checks the quiz disclosure DTO. Both npm audit commands reported zero vulnerabilities.

## Residual risks and limits

- Real S3-compatible provider credentials, IAM/bucket policy, TLS, object retention, CDN behavior, and signed URL delivery are not configured or audited. Production media access remains unavailable until provisioned and tested.
- Quiz post-submit review policy is provisional. Automatic completion policy is intentionally not implemented while unresolved.
- Rate limiting remains BE-01's process-local limiter; a horizontally scaled deployment needs an approved shared/edge strategy.
- This is a source and automated-test review, not a penetration test, production database review, or compliance certification.
