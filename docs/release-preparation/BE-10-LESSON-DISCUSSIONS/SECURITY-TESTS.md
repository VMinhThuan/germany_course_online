# Security checks

The integration suite covers:

- Anonymous DTO redaction for another Student and real author identity for Admin.
- Student enrollment denial, cross-lesson reply rejection, strict-body identity spoofing rejection, and Student denial on Admin endpoints.
- Nested reply ancestry and atomic subtree invisibility after deletion.
- Admin moderation edit and history suppression from Student API.
- Revision conflicts under simultaneous edits and exact ten-minute boundary enforcement.
- Reaction replacement/removal without exposing reactor identity.
- Student feature flag behavior while Admin summary remains available.

The broader repository check is still required before release. Production indexes and environment configuration have not been changed or inspected for rollout readiness.
