# Auth, Cookie, CORS and Proxy

The BE-06B code preserves refresh-cookie handling, `X-CSRF-Protection`, exact `APP_ORIGINS` allowlisting, and the existing origin checks. Wildcard CORS and CSRF bypasses are not introduced. The frontend keeps `credentials: include` for refresh/logout flows.

The frontend SPA rewrite is present. The same-origin `/api/:path*` destination is pending creation of the backend Vercel project and verification of its assigned domain. Vercel external rewrites act as a reverse proxy and same-team protected rewrites can grant access when the visitor is authenticated to the source deployment; keep SSO protection enabled. After configuration, validate GET/POST/PUT/PATCH/DELETE, forwarded `Origin`, `Set-Cookie`, refresh rotation and CSRF rejection before claiming auth smoke success. Do not bypass CSRF or add a protection-bypass secret to make the proxy work.
