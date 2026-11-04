# GitHub Actions and CI/CD

`.github/workflows/quality-gates.yml` runs on pull requests and pushes to `main`, with read-only repository permission and Node.js 22. It uses `npm ci`; the frontend runs typecheck/lint/unit tests/build/format check, and the backend runs its full check including OpenAPI validation, lint, format, build and MongoMemory-backed tests. A separate browser job runs BE-04 and BE-05 Playwright E2E against the existing isolated MongoMemory replica set.

The workflow does not read deployment secrets or publish artifacts. Vercel Git Integration is the deployment mechanism, preventing duplicate CLI deploys. CI branch-protection enforcement has not been verified and is not claimed here. Run [#7](https://github.com/VMinhThuan/germany_course_online/actions/runs/41788527881) completed successfully for `main` at `3063a1ee889fb97bf10449925c9faeb1f3685a7e`.
