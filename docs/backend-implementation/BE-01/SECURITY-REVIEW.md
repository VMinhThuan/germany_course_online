# BE-01 Security Review

## Implemented controls

- Zod validates environment and all write/query inputs. Auth write objects reject unknown keys.
- Passwords use Argon2id. Password hashes are hidden by default. Email has a unique normalized index.
- Access JWT algorithm is pinned to HS256; issuer, audience, expiry, signature, and required claims are validated.
- Protected requests check JWT `sid` ownership and reload current session/user status and expiry from MongoDB.
- Student session replacement is transactional and backed by a partial unique index. Admin sessions remain unconstrained by the Student policy.
- Refresh/reset tokens are high-entropy opaque values. Only SHA-256 hashes are persisted; raw refresh tokens are cookie-only and raw reset tokens are email-only.
- Refresh rotation and reset consumption are transactional. A bounded refresh-token reuse history detects recent replay.
- Exact CORS origin allowlist; credentialed CORS is limited to login/refresh/logout. Refresh/logout additionally validate Origin and a custom header.
- Helmet, JSON body size limit, route rate limits, request IDs, centralized errors, and a privacy-safe structured request logger are enabled.
- Logs omit query strings, headers, body, and connection values. Unexpected failures log only request ID and error class; production responses never return stack traces.
- Public serializers use allowlists. Payment settings, lesson content, private media keys, and asset provider IDs are not returned.
- Development/test cannot connect to a non-loopback MongoDB host. Production index creation is refused by the supplied script.

## Verification

- Unit/integration tests verify password hashing, strict role-injection rejection, JWT algorithm/expiry checks, session owner/expiry/revocation checks, blocked accounts, concurrent Student login, refresh race/replay, logout idempotence, reset replay, and role guard behavior.
- Media tests verify public association requirements and storage-key redaction.
- `npm audit --omit=dev` and full `npm audit` reported zero advisories after pinning `minimatch` 11.0.4 for the ESLint dependency tree.
- No credential URI or production secret is present in `.env.example` or documentation.

## Remaining security/operations decisions

- IP address and user-agent fields in `login_events` are personal data; retention and deletion policy remain open.
- The CSRF control is exact Origin plus a required custom header, backed by SameSite and credentialed CORS allowlisting. A synchronizer-token flow is not implemented.
- The rate limiter uses process-local memory and resets with process restart; multi-instance deployments need an approved shared/edge strategy.
- Password-reset email delivery requires configured SMTP and real deployment URL. It was not tested against a provider.
- Real MongoDB credentials, production TLS, secret storage, access policies, backups, and Admin bootstrap were not provisioned or audited here.
- This is an implementation review, not a penetration test or compliance certification.
