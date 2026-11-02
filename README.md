# Germany Course Online

A Vietnamese-language frontend demo for a German A1.1 learning website. The current demo includes the public course catalog and preview, fictional student authentication, and a student dashboard. It does not include a backend or real authentication.

## Run locally

```powershell
cd frontend
npm ci
npm run dev
```

The development server opens the product landing page. Development-only showcases are available at `/__dev/ui-kit`, `/__dev/lms-kit`, and `/__dev/layouts/public`.

## Routes

- Public: `/`, `/courses`, `/courses/:slug`, `/courses/:slug/preview`
- Demo authentication: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Student demo: `/student`, `/student/courses`

All built-in account emails use fictional `.test` domains. Demo passwords are not persisted. Do not use a real password or treat the frontend route guard as authorization.

## Verification

Run these commands from `frontend/`:

```powershell
npm run check
npm run format:check
npm run e2e
npm run e2e:production
npm audit
```

See [`docs/ui-implementation/phase-2b/`](docs/ui-implementation/phase-2b/) for the auth/session architecture, route map, test results, visual evidence, limitations, and Phase 2C handoff.
