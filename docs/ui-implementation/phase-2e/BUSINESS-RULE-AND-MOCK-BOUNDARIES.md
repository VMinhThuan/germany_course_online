# Phase 2E — Business rules and mock boundaries

- Profile is limited to a display name, fictional `.test` email and account status. The user cannot edit role, status or enrollment through this form.
- Password change checks the current demo password and a minimum length of eight characters, then ends the current local session. This is not real credential storage or password security.
- V3 specifies `ONE_ACTIVE_SESSION`; the screen presents one active session, not multiple-device session management. Revocation is available only for the current mock session.
- A revoked/invalid session clears protected query cache before login; the login status message explains why reauthentication is required.
- Public FAQ copy may describe demo navigation and content limits. It does not invent refunds, contact details, service guarantees, teacher promises, official course terms or real payment claims.

All auth/session guarantees must be reimplemented and enforced by the production identity service.
