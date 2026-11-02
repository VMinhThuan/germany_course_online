# Known limitations

1. **Demo only:** no real auth backend, user database, session endpoint, JWT, refresh rotation, secure cookie, or authorization check exists in this frontend phase.
2. **No API DTOs:** V3 endpoint request/response DTOs and cookie-versus-token handling are not defined in this workspace. Form fields, demo errors, and reset behavior must not be treated as final backend contracts.
3. **In-memory registration:** registered profiles/passwords and reset state disappear when the repository instance is recreated. The simulated password is not persisted to browser storage.
4. **Session storage:** only a non-sensitive user ID is kept in `sessionStorage`. Built-in personas can be reconstructed after reload; an in-memory registered account cannot.
5. **Single-instance lifecycle:** one-active-session behavior, revocation, and invalidation are local to one JavaScript repository instance. There is no cross-tab/device revocation push, background refresh, or real new-login event.
6. **Password reset:** forgot/reset does not send email. The reset token is a stable mock token and state is held in memory; expiry/used states are controlled demo states, not backend guarantees.
7. **Access data:** A1.1 progress and expiry use deterministic fictional fixtures and `DEMO_NOW`. The server must determine entitlement and paid-content access once connected.
8. **Unavailable features:** full lessons, profile editing, checkout/payment, renewals, quizzes, Admin UI, and paid media routes are intentionally absent.
9. **Computer Use:** unavailable because the helper failed initialization during Phase 2A; visual verification used Playwright/Chromium instead.

Do not claim production security, account creation, email delivery, enrollment issuance, or access authorization from this demo.
