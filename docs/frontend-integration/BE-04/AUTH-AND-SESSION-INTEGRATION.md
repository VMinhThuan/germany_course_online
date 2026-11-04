# Authentication and Session Integration

## Flow

`frontend/src/lib/auth/api-auth.ts` maps login/register/reset/current-user APIs. `frontend/src/app/auth/api-pages.tsx` renders the production forms. `AuthSessionProvider` in `frontend/src/app/auth/auth-session.tsx` restores the session through `/auth/refresh` and `/auth/me`; protected routes and role redirects are in `auth/routes.tsx`.

- Registration creates the backend Student and leaves the user signed out; UI displays success and a route to login.
- Login sends credentials to the backend. STUDENT and ADMIN routes are selected from the returned server role.
- Access JWT exists only in module memory (`frontend/src/lib/api/client.ts`); it is not stored in localStorage/sessionStorage.
- Refresh/logout include cookies and the configured CSRF header. A single shared refresh promise prevents concurrent refresh-token rotation.
- `SESSION_REVOKED` clears the access token and account-scoped TanStack Query entries, terminates protected work and sends the browser to login with a replacement/revocation message.
- Return targets are sanitized against external origins and restricted to recognized application paths.

## Operations

`POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset`; `GET /auth/me`; student profile/password/session endpoints are documented in [API-REPOSITORY-MAPPING.md](API-REPOSITORY-MAPPING.md).

## Evidence

Isolated browser E2E confirms registration does not create an authenticated session, refresh restores a session after reload, logout calls the API, and a later Student login revokes the previous browser session. The backend authorization layer was exercised using a real Express process and isolated replica set, not mocked repository responses.

## Operational limits

Reset email delivery and real SMTP are not verified. Admin provisioning in the E2E server is a test-only bootstrap fixture; public registration never assigns Admin. Production cookie/CORS behavior and deployed origin settings still require environment-specific verification.
