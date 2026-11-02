# Authentication and session state matrix

## Auth forms

| Screen   | State                                     | User-facing result                                                                               |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Login    | Empty/malformed                           | Field-level required/email-format errors; no backend password policy is claimed.                 |
| Login    | Pending                                   | Submit shows loading and blocks duplicate action.                                                |
| Login    | Demo account selected                     | Repository returns a local demo session, provider updates, then routes to sanitized destination. |
| Login    | Invalid credentials / 401                 | Generic demo credential message; no session-wide logout.                                         |
| Login    | 403 / 429 / 500 / network                 | Provisional status-specific or network message.                                                  |
| Login    | Session revoked/invalid                   | Session and student cache clear; inline explanation appears on login.                            |
| Register | Invalid fields or password mismatch       | Inline field errors.                                                                             |
| Register | Duplicate `.test` address / 409           | Conflict message; account is not signed in automatically.                                        |
| Register | Success                                   | In-memory demo account created; success says no verification email was sent; link to login.      |
| Forgot   | Invalid/empty email                       | Field validation.                                                                                |
| Forgot   | Request success, known or unknown address | Same demo acknowledgement; no email is sent; controlled link opens reset route.                  |
| Forgot   | Network/service error                     | Inline retryable message.                                                                        |
| Reset    | Missing/invalid/expired/used token        | Repository-provided state message; password form unavailable.                                    |
| Reset    | Valid token, pending                      | Submit loading.                                                                                  |
| Reset    | Valid token, success                      | Only the current in-memory demo account password can change; explicit mock-only success.         |

## Session state

The provider's exact status values are `checking`, `anonymous`, and `authenticated`. `sessionEndReason` separately records `revoked` or `invalid`; recoverable network failures stay in form/query error state rather than becoming a session status.

| Trigger                             | Repository result                    | Provider/cache action                              | Route and message                                    |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------------------------------- |
| App startup                         | stored built-in demo user ID or none | Restore one local demo session or remain anonymous | protected route waits while checking                 |
| Login success                       | `DemoSession`                        | accept session; remove old `student` queries       | sanitized `returnTo` or `/student`                   |
| Logout                              | successful local cleanup             | clear key, session, all `student` queries          | anonymous; protected destination goes to login       |
| Next protected request after revoke | 401 `SESSION_REVOKED`                | clear key/session/student cache; notification      | login with `sessionRevoked=1` and inline explanation |
| Invalid local session               | 401 `DEMO_SESSION_INVALID`           | same protected-data cleanup                        | login with `sessionInvalid=1`                        |
| Login credential rejection          | 401 without session code             | no session-wide cache/session action               | remain on login with generic message                 |

## Enrollment/access state

| Stored V3 status                  | Derived UI access state | UI behavior                                                                                  |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `ACTIVE`, `expiresAt` in future   | `available`             | Display progress and status; only public detail/preview routes are actionable in this phase. |
| `ACTIVE`, `expiresAt <= DEMO_NOW` | `expired-display`       | Display expiry; no paid content; renewal unavailable. `EnrollmentStatus` remains `ACTIVE`.   |
| `REVOKED`                         | `revoked`               | Explicit revoked explanation; course card does not create access.                            |
| No records                        | empty                   | Explain no enrollment and offer discovery/free preview.                                      |

The contract enum remains `EnrollmentStatus.ACTIVE | REVOKED`. There is no `EnrollmentStatus.EXPIRED` value.
