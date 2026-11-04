# Remaining Blockers and Limits

## Full Production auth lifecycle

**Status:** PARTIAL / BLOCKED for `AUTH_PASS`.

No approved Production test account was provided. As a result, this verification did not perform a real login, refresh-cookie rotation, or logout cookie lifecycle against Production. A new user was not created and the Production database was not modified. Anonymous route contracts and access denials were verified; see [AUTH-COOKIE-REWRITE-VERIFICATION.md](AUTH-COOKIE-REWRITE-VERIFICATION.md).

## Published course content

The live public course endpoint currently returns `200` JSON with `total: 0` and an empty `items` array. This proves the public API route passes through the frontend rewrite and reaches Express, but there are no published items to display. Publishing catalog data is outside the scope of this proxy hotfix.

## Deployment Protection

Vercel SSO protection was not disabled or changed. The fix routes API traffic to the stable backend Production domain, which returned Express responses during verification. Branch deployment aliases that return the Vercel SSO redirect remain subject to their protection policy.

## Follow-up checks

- Recheck the implementation GitHub Actions workflow conclusion and record it in [DEPLOYMENT-VERIFICATION.md](DEPLOYMENT-VERIFICATION.md).
- After pushing this documentation commit, verify its GitHub Actions run and confirm both latest Production deployments remain `READY`.
- If full Production login lifecycle proof is required, use an explicitly approved existing test account; do not create one implicitly.
