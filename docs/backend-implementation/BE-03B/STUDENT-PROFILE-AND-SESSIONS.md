# Student Profile and Sessions

## Operations

- `GET /api/v1/me/profile`
- `PATCH /api/v1/me/profile`
- `PUT /api/v1/me/password`
- `GET /api/v1/me/sessions`
- `DELETE /api/v1/me/sessions/{sessionId}`

All five routes require an authenticated STUDENT. Profile patch accepts only `fullName`, `phone`, and `avatarAssetId`; email, role, status and other fields are rejected. An avatar must be a ready PUBLIC image. If signed media delivery is available the response includes a short-lived URL; if the optional provider is unavailable the profile remains readable with `avatarUrl: null`.

Password changes require the current password and a new password of at least 12 characters. The current Argon2id policy is reused. A successful change revokes all active sessions and records an audit event, so the Student must log in again.

Session listing returns at most 50 records with device name, status, `lastActiveAt`, expiry time and `isCurrent`; `lastActiveAt` advances on successful token refresh, not on every stateless access-token request. It omits IP, user agent, refresh token/hash and other credentials. A Student can revoke only a session with their own user ID. Revoking the current session invalidates subsequent requests using it.
