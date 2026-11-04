# Frontend Vercel Configuration

`frontend/vercel.json` provides an SPA rewrite to `/index.html`, so React Router paths can be loaded directly. The existing Vercel project is linked to this repository and Vite build logs show output under `dist`. Its explicit Root Directory and command fields are not exposed by the connector; `frontend` is inferred from the Vite build and the absence of a root package manifest, not verified in Settings.

`VITE_API_BASE_URL` is public build-time configuration and defaults to `/api/v1`. The `/api/:path*` external rewrite now targets the backend project's `git-main` alias and is ordered before the SPA fallback. Read-only GETs to the deployed root and `/courses` both returned 200 and served the SPA document. A GET to the frontend `/api/v1/courses` did not complete because the protected backend required authentication through the rewrite. SSO remains enabled; browser cookie and CSRF behavior has not been verified. Production API-backed routes are not operationally ready.

No backend credential belongs in a `VITE_` variable. Preview and Production values must be reviewed separately; Preview auth is not declared operational until its exact origin is allowed by the backend.
