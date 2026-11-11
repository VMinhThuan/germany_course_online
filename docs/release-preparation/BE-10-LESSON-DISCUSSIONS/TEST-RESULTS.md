# Test results

- Backend `npm run check`: passed. This includes typechecks, lint, formatting, OpenAPI validation, 18 Vitest files with 141 passing tests, and the TypeScript build.
- Frontend typecheck, lint, formatting, and production build: passed.
- Frontend full Vitest run with four workers: 35 of 35 files passed, 194 of 194 tests passed.
- Focused Student discussion and lesson-page tests: 11 passed, including the default-visible section and active lesson ID.
- Focused BE-10 backend integration coverage: 8 tests passed on the disposable MongoDB replica set.

No production database writes or index changes were made. No authenticated browser E2E against staging or production was run; see `E2E-RESULTS.md`.
