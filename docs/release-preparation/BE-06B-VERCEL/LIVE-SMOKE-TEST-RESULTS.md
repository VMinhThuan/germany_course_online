# Live Smoke Test Results

**Status:** `NOT_RUN`; BE-06B source has not yet been deployed.

After deployment, record independent results for frontend root and direct SPA routes, backend `/health`, database-backed `/ready`, OpenAPI document/docs, public course API, and same-origin API/auth cookie flow. Do not call `/ready` operational if Mongo is unconfigured. Do not create users, send real email, exercise payment operations, or modify production data as smoke tests.

Existing baseline evidence is limited to a READY Vite Production deployment for the pre-BE-06B SHA. No route was fetched in this phase. The existing deployment is SSO protected. Run only safe read-only checks after the new deployment is available; do not create users, send real email, exercise payments or modify production data.
