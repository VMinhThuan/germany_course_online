# Phase 2E — E2E journeys

Playwright checks:

1. Update display name → see the saved status and updated student header.
2. Change demo password → revoke current session → read the login status → sign in with the new credential → inspect active session summary.
3. Open public FAQ → run axe → expand the checkout question and verify it says the checkout is hypothetical.
4. Navigate student/help routes at 1440 × 900, 768 × 1024, 390 × 844 and 320 × 640 without horizontal overflow.
5. Existing Phase 2B flows cover normal logout, revoked session, protected deep link and retry after a transient repository error.

Profile, password, sessions and help screenshots are saved under `screenshots/`.
