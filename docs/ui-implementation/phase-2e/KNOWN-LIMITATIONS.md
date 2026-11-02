# Phase 2E — Known limitations

- Demo identities, credentials, sessions and profile records are local browser state; password text is not backed by a secure identity provider.
- Password changes in separate tabs/devices, refresh-token rotation, account recovery, MFA, email verification and account lockout are not implemented.
- V3 specifies a single active session. Device name/time are mock summaries; there is no real device inventory or cross-device revoke API.
- Help is static and intentionally omits unapproved contacts and commercial policies.
- Backend authorization, audit logs, session revocation delivery and privacy/retention policy require product/security review before release.
