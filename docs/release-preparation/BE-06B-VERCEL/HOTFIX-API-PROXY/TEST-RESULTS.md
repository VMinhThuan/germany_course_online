# Test Results

**Source commit:** `6db968ab7906b267c1e6a02bfbefa382841a1828`
**Date:** 2026-11-04

All listed gates completed locally against the implementation commit.

| Gate | Result | Evidence |
| --- | --- | --- |
| Backend `npm run check` | PASS | TypeScript typecheck, lint, Prettier, OpenAPI validation (75 paths / 978 references), 103 tests across 12 files, and TypeScript build |
| Frontend `npm run check` | PASS | Typecheck, lint, 123 tests, and production build (2,278 modules) |
| Frontend `npm run format:check` | PASS | Formatting check completed |
| BE-04 `npm run e2e:be04` | PASS | 4/4 end-to-end checks with isolated MongoMemory replica set |
| BE-05 `npm run e2e:be05` | PASS | 7/7 checks; 37 accessibility route/viewport scans and zero axe findings |
| `git diff --cached --check` | PASS | No whitespace errors in the implementation commit |

The local end-to-end suites used only isolated synthetic test data. They did not create a real Production user or alter the Production database. Production HTTP checks are recorded separately in [AUTH-COOKIE-REWRITE-VERIFICATION.md](AUTH-COOKIE-REWRITE-VERIFICATION.md).
