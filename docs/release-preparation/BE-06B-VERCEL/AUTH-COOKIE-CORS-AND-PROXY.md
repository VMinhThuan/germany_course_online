# Auth, Cookie, CORS and Proxy

The BE-06B code preserves refresh-cookie handling, `X-CSRF-Protection`, exact `APP_ORIGINS` allowlisting, and the existing origin checks. Wildcard CORS and CSRF bypasses are not introduced. The frontend keeps `credentials: include` for refresh/logout flows.

The frontend rewrite sends `/api/:path*` to `https://paniversedeutsch-backend-git-main-nguyen-phi-vus-projects.vercel.app/api/:path*` before the SPA fallback. Both Vercel projects have SSO protection enabled. A read-only GET through the frontend deployment returned a Vercel authentication redirect at the protected backend; the authenticated-fetch share link did not complete that cross-project check. Keep SSO enabled and do not add a protection-bypass secret. Browser auth, forwarded `Origin`, `Set-Cookie`, refresh rotation, CSRF rejection, and write methods remain unverified. The same-origin API is not yet operationally verified.
