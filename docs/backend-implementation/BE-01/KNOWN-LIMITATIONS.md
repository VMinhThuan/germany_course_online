# Known Limitations

## External service readiness

- Production MongoDB, credentials, DNS/TLS, secret manager, and production indexes were not configured. The only database used was the disposable local integration-test replica set.
- SMTP is unconfigured. The development/test fake mail service captures deliveries in memory; production reset email is unavailable without SMTP plus `PASSWORD_RESET_URL`.
- Admin bootstrap is intentionally absent. There is no Admin registration route or invented credential.
- Frontend origins and cookie-domain topology are sample/local until the owner supplies production values.

## Media and public catalog

- No media upload, object-store provider, signed URL, CDN resolver, or media content delivery is implemented.
- Public media returns metadata only. `thumbnailUrl` and `logoUrl` are null; `PublicMedia.url` is omitted.
- Site settings are read-only and are not seeded. The public route returns 404 until an approved `site_settings` singleton exists.
- Course/section/lesson write validation and publishing workflows are not included. Public reads filter visibility and deletion state at every level.

## Auth and operations

- Access/session lifetimes and sort options are BE-01 technical defaults, not final production policy.
- Replay detection retains only five previous refresh-token hashes. Older replay attempts fail but cannot be identified as a reuse event.
- Rate limiting is process-local; horizontal deployments need shared/edge enforcement.
- Login-event IP/user-agent retention and deletion have not been decided.
- Password reset delivery and actual SMTP transport were not tested. The API is generic when a recipient does not exist and does not expose a reset token in JSON.
- No real browser smoke test, production API start, Vercel build/deployment, Atlas connectivity, or production data write was performed.

## Product decisions

- Approve or change the proposed registration-without-auto-login flow.
- Confirm the public media URL/provider and whether `PUBLIC` visibility is sufficient for each media role.
- Approve Admin bootstrap, SMTP provider, token lifetimes, origins, cookie policy, and PII retention.
- Confirm any API sort/filter additions before treating these BE-01 query defaults as long-term product behavior.
