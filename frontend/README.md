# Frontend

React/Vite client for the Germany Course Online A1.1 demo. It includes the public landing page, course catalog/detail/free preview, demo authentication, and student dashboard/My Courses.

## Requirements

- Node.js 22.18.0 (verification version; Vite 8 requires Node.js 20.19+ or 22.12+)
- npm 10.9.3 (verification version)

## Start

```powershell
npm ci
npm run dev
```

The root route `/` is the public landing page. Development-only component showcases are available at `/__dev/ui-kit`, `/__dev/lms-kit`, and `/__dev/layouts/:layout`.

## Commands

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
npm run e2e:production
npm run format:check
npm run check
npm audit
```

Run `npm run build` before `npm run e2e:production` to smoke-test the production bundle.

## Architecture and scope

- `src/shared/tokens`, `src/shared/ui`, and `src/shared/layouts` hold the shared visual system.
- `src/domains` contains reusable LMS components and presentation models.
- `src/data/public-demo` is the safe public course/preview adapter.
- `src/data/student-demo` contains the narrow, fictional auth/student demo repositories.
- `src/app/ProductionApp.tsx` mounts product routes; `src/app/App.tsx` adds development-only showcases and scenario controls.
- `../docs/ui-research` and `../docs/ui-implementation` contain research, decisions, test results, and screenshots.

Authentication and student records are simulated in the browser. There is no backend, email delivery, real session validation, checkout, payment, quiz, full learning route, or Admin UI in this phase. See [`../docs/ui-implementation/phase-2b/KNOWN-LIMITATIONS.md`](../docs/ui-implementation/phase-2b/KNOWN-LIMITATIONS.md) and [`../docs/ui-implementation/phase-2b/PHASE-2C-HANDOFF.md`](../docs/ui-implementation/phase-2b/PHASE-2C-HANDOFF.md).
