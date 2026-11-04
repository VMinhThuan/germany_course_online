# Security and Accessibility Review

## Security checks

- Access token remains in memory; refresh cookie is credentialed and refresh requests carry `X-CSRF-Protection`.
- Refresh rotation is single-flight, preventing concurrent refreshes with a rotating cookie.
- Session replacement behavior was verified against live Express/MongoMemory and yields `SESSION_REVOKED` in the old browser.
- Student entitlement is enforced by protected backend endpoints; an order or local expiry label does not grant access.
- Synthetic purchase report remains PENDING until explicit Admin approval. E2E demonstrated pre-approval denial and post-approval access.
- Admin front-end route guard is only a UX boundary; backend RBAC protects Admin operations.
- `npm audit` reported 0 known vulnerabilities for both frontend and backend dependency trees at check time.
- No production Atlas connection, payment, email, upload or deployment was used.

## Accessibility evidence

`@axe-core/playwright` scanned `/`, `/login`, and `/admin` using `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. The gate fails on any `critical` or `serious` violation; all three pages passed that gate. Forms use labels/descriptions, feedback uses status/alert roles, and route loading announces a status. This scan did not gate moderate/minor findings and did not cover every route, viewport, keyboard path or assistive technology.

## Residual review scope

Production CSP/cookie/CORS headers, deployment secrets, mail delivery, S3 signing, real keyboard-only journey, screen reader behavior, contrast at all states, cross-Student order authorization and exhaustive Admin authorization need environment/security review before release. The frontend guard is never represented as backend authorization proof by itself.
