# Auth, CORS, Cookie, and HTTPS Security

**Status: IMPLEMENTED locally; deployed-origin behavior is PREPARED_ONLY.** Source evidence: `backend/src/app.ts`, `backend/src/http/csrf.ts`, `backend/src/modules/auth/routes.ts`, `backend/src/modules/auth/service.ts`, and auth integration tests.

## Current controls

- Helmet is enabled; `x-powered-by` is disabled. Express has no blanket `trust proxy` setting.
- CORS allows only exact configured origins. API CORS does not enable credentials globally. Login, refresh, and logout responses set credential permission only for an exact allowed `Origin`.
- Refresh cookie is named `paniverse_refresh`, `HttpOnly`, path-scoped to `/api/v1/auth`, and configured from `COOKIE_SECURE`, `COOKIE_SAME_SITE`, and session expiry.
- Production environment validation requires `COOKIE_SECURE=true`. Refresh and logout require the exact allowed Origin and `X-CSRF-Protection: 1`.
- Access token is returned in the auth response; refresh token is stored in the cookie. Refresh rotates the token/session. Logout revokes the session and clears the cookie.
- Request IDs are generated server-side. Request logs include method, path, status and duration, not headers, cookies, bodies, query values or tokens. Error responses do not expose stacks.
- Admin APIs use auth/role middleware; no public Admin signup route exists.

## Deployment topology

- Prefer frontend and API hosts under the same registrable site (for example, separate `app` and `api` subdomains) with HTTPS, exact cross-origin allowlisting, `SameSite=Lax`, and `Secure=true`.
- Use `SameSite=None` only if the approved cross-site topology requires it, with HTTPS and `Secure=true`; separately verify browser third-party-cookie behavior.
- Set `APP_ORIGINS` to the exact frontend origin(s), no wildcard/path. Ensure preflight allows `Authorization`, `Content-Type`, `X-CSRF-Protection`, `X-Request-Id`, `X-Device-Name`, and `Idempotency-Key` as needed.
- The platform must redirect HTTP to HTTPS and forward only expected proxy headers. Before using `trust proxy`, configure the exact trusted proxy hop count/range and validate client IP/rate-limit behavior; never set it blindly to `true`.
- `PASSWORD_RESET_URL` must be an approved HTTPS frontend URL. Reset token is one-time, hashed at rest, and expires after 30 minutes; verify the hosted reset page consumes it without leaking it to analytics/referrers.
- Review Helmet's deployed CSP and any embedding needs with the actual frontend/video provider. Local secure-header tests are not a deployed-origin or full CSP review.

## Verification boundary

**LOCALLY_TESTED:** exact-origin CORS, preflight, CSRF rejection paths, cookie properties and auth/session flows in BE-04/BE-05 tests. **NOT_RUN:** browser refresh-cookie behavior on the staging host, proxy forwarding, TLS certificate, production CSP, or third-party cookie compatibility.
