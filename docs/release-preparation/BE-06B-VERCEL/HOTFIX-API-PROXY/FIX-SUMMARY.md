# Fix Summary: Vercel API Proxy

**Implementation commit:** `6db968ab7906b267c1e6a02bfbefa382841a1828`
**Commit message:** `fix(vercel): route API to backend production domain`

## Change

Updated the frontend Vercel rewrite so `/api/:path*` is forwarded to:

```text
https://paniversedeutsch-backend.vercel.app/api/:path*
```

The API rewrite remains before the SPA fallback, so API errors stay API JSON responses and are not replaced with `index.html`.

## Files changed

- `frontend/vercel.json` — use the backend stable Production domain for API requests.
- `backend/tests/unit/vercel-proxy-config.test.ts` — assert the target and rewrite ordering, and prevent routing back to a `git-main` alias.
- `frontend/src/lib/api/client.test.ts` — cover anonymous public requests and expected anonymous refresh behavior.
- `backend/tests/integration/backend.test.ts` — explicitly cover anonymous public routes and refresh without a session cookie.

## Security and scope

- Vercel SSO Deployment Protection was not disabled or modified.
- JWT, RBAC, server-side session checks, and CSRF enforcement were not weakened.
- No environment variable, credential, MongoDB record, or production user was changed or created.
- The change only updates the frontend's API destination and adds regression coverage.

See [ROOT-CAUSE-ANALYSIS.md](ROOT-CAUSE-ANALYSIS.md) and [AUTH-COOKIE-REWRITE-VERIFICATION.md](AUTH-COOKIE-REWRITE-VERIFICATION.md) for response evidence and auth limitations.
