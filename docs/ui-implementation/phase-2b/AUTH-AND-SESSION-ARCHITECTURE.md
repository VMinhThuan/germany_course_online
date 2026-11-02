# Authentication and session architecture

## Replaceable boundary

`src/data/student-demo/types.ts` defines `AuthRepository`, `StudentRepository`, `StudentDemoRepositories`, and the local demo session/view types. `src/data/student-demo/repository.ts` is the in-memory demo adapter. `studentDemoRepositories` is the single composition point imported by auth/session and student query modules; pages do not instantiate repositories.

`AuthSessionProvider` in `src/app/auth/auth-session.tsx` owns the only UI session state. Its exact provider status union is `checking | anonymous | authenticated`; session-ending context is carried separately as `revoked | invalid`. It exposes `acceptSession`, `refreshSession`, and `logout` through `useAuthSession`.

`ProtectedStudentRoute` wraps `/student` and `/student/courses`. Authenticated data queries use keys beginning with `student`. On a student query error with `SESSION_REVOKED` or `DEMO_SESSION_INVALID`, the global `QueryCache` publishes a session-end event. The provider clears the demo session and all student queries, sends a warning notification, and the route guard redirects to `/login` with a safe notice flag.

## Session lifecycle

1. On startup, the provider calls `restoreSession()` and presents a checking screen until it resolves.
2. Explicit persona selection or a successful in-memory demo credential login returns a `DemoSession` and updates shared state.
3. Only the demo user ID is written to `sessionStorage` under `deutsch-a11.demo-session-user`. The value is not a JWT, refresh token, or authorization credential.
4. A protected student query validates the session in the repository. A revoked or invalid session produces a typed `DemoRepositoryError` with its status/code.
5. Session-end handling removes student query cache and clears the session key. Login presents an explanatory inline alert.
6. Logout awaits repository cleanup, removes student query cache, clears provider state, and returns protected routes to login.

The repository models one active session within its current JavaScript instance: starting a different session marks the previous demo session ID revoked. It does not simulate cross-tab/device events or real-time push logout.

## Return path

`sanitizeReturnTo` permits only `/student` and `/student/courses` (including their query/hash). It rejects external, protocol-relative, backslash, control-character, and non-allowlisted paths and falls back to `/student`. The login page uses the sanitized target after success.

## Error mapping

| Repository result          | Demo presentation                                                                |
| -------------------------- | -------------------------------------------------------------------------------- |
| Network kind               | “Không kết nối được dịch vụ demo”; retry is available where relevant.            |
| 401 credential rejection   | Generic email/password mismatch. This does not end an authenticated session.     |
| 401 `SESSION_REVOKED`      | Clear session/cache, notify, redirect to login with revoked explanation.         |
| 401 `DEMO_SESSION_INVALID` | Clear session/cache, notify, redirect to login with invalid-session explanation. |
| 403                        | Demo account unavailable message.                                                |
| 409                        | Duplicate fictional `.test` address message.                                     |
| 422                        | Input/token validation presentation; reset-state codes are mock-only.            |
| 429                        | Provisional rate-limit presentation.                                             |
| 500/service                | Generic demo service failure and retry guidance.                                 |

No endpoint-specific V3 error codes are inferred except the documented `SESSION_REVOKED` code. Other statuses are UI simulation values until API contracts are confirmed.

## Production boundary

`ProductionApp` mounts the same product routes/providers but not `StudentDemoDevControls` or developer showcase routes. The repository enables event-driven scenarios only under `import.meta.env.DEV`. The production bundle smoke test confirms the development scenario event names are absent.

This remains a frontend demonstration. A route guard is not authorization and must not protect paid content. No real API, JWT, refresh-token rotation, secure cookie, email, or backend session validation is implemented.
