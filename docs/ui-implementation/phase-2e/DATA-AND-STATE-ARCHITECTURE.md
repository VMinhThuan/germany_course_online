# Phase 2E — Data and state architecture

- `StudentAccountRepository` owns get/update profile, change demo password, safe session list and session revoke.
- Profile identity uses email/user ID from the current auth session; editable display name is reflected in `AuthSessionProvider` and the product repository.
- `acceptSession` removes student query cache only when the session ID changes. Updating a profile inside the same session does not unmount forms or erase same-user query state.
- Password change calls the account repository, which updates the local demo credential and revokes the current session. Auth logout accepts a `revoked` reason so the protected route returns the user to an explanatory login state.
- Session DTOs expose device label, last active, status and current-session flag only. Passwords, tokens, hashes, raw user agents and IPs are not included.
- Help content is static approved copy; it has no account or order persistence.
