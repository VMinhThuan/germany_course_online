# Phase 2E — Account and support

Implemented student profile editing, demo password change, current-session listing/revocation and a public help/FAQ route. Profile updates flow through the user-scoped account repository and update the current auth session without discarding same-session learning/order query state. Password changes update only the mock credential store, revoke the current local session, and return to login with an explanatory status. Session UI shows one safe summary with device label, last-active time, status and current-session indication.

Help content explains the public site, preview, learner navigation, demo account and mock checkout without promising refunds, support contacts, guarantees or payment terms.

Implementation is centered in `frontend/src/app/student-lms/account-pages.tsx`, `frontend/src/app/public-site/pages.tsx`, and the auth session provider. No backend or database code changed.
