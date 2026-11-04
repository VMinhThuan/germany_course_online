# BE-02 Test Results

## Final quality run

Command: `npm run check` from `backend/`.

| Gate                                                     | Result                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| TypeScript strict typecheck                              | PASS                                                                               |
| ESLint (`--max-warnings=0`)                              | PASS                                                                               |
| Prettier check                                           | PASS                                                                               |
| OpenAPI 3.1 parse, references, sync and operation checks | PASS — 67 paths, 834 internal references, 11 BE-01 operations, 18 BE-02 operations |
| BE-01 + BE-02 unit, integration and contract tests       | PASS — 52/52 across 6 test files                                                   |
| Production TypeScript build                              | PASS                                                                               |
| `npm audit`                                              | PASS — 0 vulnerabilities                                                           |
| `npm audit --omit=dev`                                   | PASS — 0 vulnerabilities                                                           |

The total includes the 39-test BE-01 regression baseline plus 13 BE-02 tests: six MongoDB/API integration cases, two media environment configuration cases, two storage-adapter unit cases, and three contract cases. The existing BE-01 auth/public integration suite ran as part of this same full command.

## Database and test isolation

The integration tests used `mongodb-memory-server` with a disposable single-node MongoDB 8.0.34 replica set, required for transaction behavior. `tests/support/test-database.ts` creates indexes and clears BE-01 and BE-02 collections before each case. Fixtures create synthetic users, sessions, courses, enrollments, lessons, exercises, assets, and quizzes only in that temporary database. No Atlas/production MongoDB connection or write occurred.

The test media signer is an injected fake adapter; it verifies authorization and DTO behavior only. It does not prove a real object-store URL works.

The separate S3-compatible adapter unit tests generate presigned URLs locally without making a network request. They verify URL shape, TTL, response headers, invalid object-key rejection, and the unconfigured adapter's 503 behavior; they do not prove access to a real bucket.

## BE-02 coverage

- Entitlement: active/missing/expired/revoked enrollment, revoked session, unauthenticated request, cross-course section substitution, non-student role, archived parent course, and owner-scoped attempts/notes.
- Hierarchy and progress: visible published hierarchy, draft/hidden filtering, safe lesson-content projection, required manual exercise completion, quiz manual-completion rejection, repeated completion, and calculated course percentage.
- Exercise media: question and answer assets, answer access before completion, denial without entitlement, exact asset association, signing input, no storage-key response leakage, and 503 when no provider is configured.
- Quiz: attempt start/replay, safe pre-submit payload, valid/invalid options, option change, owner denial, frozen snapshot, exact decimal server grading, concurrent submit, result read, retry/replay, configured answer review, and no automatic completion.
- Notes: empty read, create/update path, per-student isolation, and 10,000-character validation. Published hierarchy filters draft, hidden, and deleted rows.
- BE-01 regression: existing auth/session, catalog, settings/media metadata, validation, CORS, and lifecycle tests remain in the suite.

## Commands

```text
npm run check
npm audit
npm audit --omit=dev
```

`npm run check` ran the production TypeScript build. No browser smoke test, production API start, Atlas connection, actual media provider test, Vercel build, or deployment was performed.
