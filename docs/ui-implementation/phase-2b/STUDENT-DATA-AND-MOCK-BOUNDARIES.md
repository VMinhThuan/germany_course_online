# Student data and mock boundaries

## Repositories and types

`src/data/student-demo/types.ts` defines:

- `AuthRepository`: list demo personas, restore/sign in, simulated register/reset, logout, and clear session.
- `StudentRepository`: dashboard and course-list reads by demo session ID.
- `DemoSession`, `StudentDashboardViewModel`, and `StudentCourseRecord`.
- `DemoRepositoryError`, which retains `status`, `code`, and `kind` for presentation mapping.

TanStack query hooks in `src/data/student-demo/queries.ts` use `['student', 'dashboard', sessionId]` and `['student', 'courses', sessionId]`, disable retries for these flows, and are cleared on logout/revocation. Public course data continues to use the separate `publicDemoRepository` from Phase 2A.

## Fictional personas

| Persona                       | Demo display name                    | Course data                                                                                          |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Registered without enrollment | Linh Nguyễn (`linh.demo@learn.test`) | No enrollment; explore A1.1 and public preview.                                                      |
| Active student                | An Trần (`an.demo@learn.test`)       | A1.1 active, 0/7 lessons, 0%.                                                                        |
| Partially completed student   | Minh Phạm (`minh.demo@learn.test`)   | A1.1 active, 2/7 lessons, 29%.                                                                       |
| Expired entitlement           | Mai Lê (`mai.demo@learn.test`)       | Enrollment status stays `ACTIVE`; access display derives expired from expiry date; 2/7 lessons, 29%. |
| Revoked enrollment            | Bình Võ (`binh.demo@learn.test`)     | `REVOKED`; appearance in the list does not grant content access.                                     |

All bundled identity addresses use `.test`. The demo course ID/slug point to the existing public A1.1 course. Progress and counts come from typed fixtures; no achievements or additional paid courses are invented.

## Storage and secrets

- Built-in demo session storage: `sessionStorage['deutsch-a11.demo-session-user'] = userId` only.
- Registered profile, password, session object, session IDs, and reset state: JavaScript memory only.
- Passwords are not placed in localStorage/sessionStorage, logged, or presented as production credentials.
- Reset token string `demo-reset-token-v1` is a deliberately mock-only token, not a backend token or security secret.
- The repository can be reset by clearing the session key or by ending/reloading the browser context. Registered accounts and their simulated passwords disappear when the repository instance is recreated.

## Isolation from Phase 1B developer data

Product pages do not import `src/data/mock` or the broad Phase 1B fixture catalog. They use the narrowly scoped `src/data/student-demo` adapter plus the existing public course adapter. Developer scenario controls live in a dev-only component and are absent from `ProductionApp`; production smoke asserts scenario event markers are absent from built bundles.

No order/payment state grants access. No private answer keys, quiz fixtures, payment secrets, or backend rows are used by student pages.

## Known persistence detail

The built-in persona fixture can be reconstructed after a reload from its stored user ID. A newly registered account exists only in memory; a reload cannot restore that account and its demo password. This limitation is intentional until a real backend contract is available.
