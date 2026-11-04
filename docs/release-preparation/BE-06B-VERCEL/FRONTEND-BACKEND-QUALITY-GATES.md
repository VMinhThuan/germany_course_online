# Frontend and Backend Quality Gates

Local BE-06B validation:

| Gate | Result |
|---|---|
| Frontend typecheck, lint, 121 unit/component tests, production build | PASS |
| Frontend format check | PASS |
| Backend typecheck, lint, 101 tests, production build | PASS |
| Backend format check and OpenAPI validation (75 paths / 96 operations) | PASS |
| BE-04 browser E2E | 4/4 PASS |
| BE-05 browser E2E and accessibility scans | 7/7 PASS; 37 axe scans, no findings |
| Full `npm audit`, frontend and backend | 0 vulnerabilities |
| `npm audit --omit=dev`, frontend and backend | 0 vulnerabilities |
| `git diff --cached --check` | PASS |

GitHub Actions `Quality Gates` run [#7](https://github.com/VMinhThuan/germany_course_online/actions/runs/41788527881) completed successfully for `main` at `3063a1ee889fb97bf10449925c9faeb1f3685a7e`. Browser E2E uses synthetic fixtures and MongoMemory; it never uses a remote MongoDB URI. The live GET smoke is recorded separately; a local build, unit test, or successful CI run does not establish that the unconfigured backend is operational.
