# Frontend Vercel Configuration

`frontend/vercel.json` provides an SPA rewrite to `/index.html`, so React Router paths can be loaded directly. The existing Vercel project is linked to this repository and Vite build logs show output under `dist`. Its explicit Root Directory and command fields are not exposed by the connector; `frontend` is inferred from the Vite build and the absence of a root package manifest, not verified in Settings.

`VITE_API_BASE_URL` is public build-time configuration and currently defaults to `/api/v1`, which is intended to use a same-origin proxy. The external proxy destination is not present yet; add it only after the backend project domain is returned by Vercel. Keep the `/api/:path*` external rewrite before the SPA fallback. Same-team protected rewrites require the visitor to be authenticated to the original deployment; test the actual cookie and CSRF flow after the proxy is deployed. Until then, production API-backed routes are not operationally ready.

No backend credential belongs in a `VITE_` variable. Preview and Production values must be reviewed separately; Preview auth is not declared operational until its exact origin is allowed by the backend.
