# Post-Deployment Handoff

## Current action needed

The Vercel Hobby team access is approved. Finish the source checkpoint, create the backend project from `main` with Root Directory `backend`, and record both Vercel deployment SHAs. Keep the existing SSO protection enabled.

## After Vercel access

1. Confirm the frontend project's exact Root Directory in Vercel Settings; Vite build evidence points to `frontend`, but the connector does not return that field.
2. Configure only owner-approved Preview/Production values through Vercel settings. Do not copy secrets into source or GitHub Actions.
3. Set the verified backend URL as the frontend API rewrite destination, then verify cookie/Origin/CSRF behavior through the protected same-team rewrite.
4. Run CI and safe read-only health/readiness checks. Keep `/ready` blocked until an isolated, owner-approved MongoDB target is configured.
5. SMTP, private media storage, custom domain/HTTPS, monitoring, backup and production plan/commercial eligibility remain owner/provider follow-up items.
5. Record project URLs, commit SHAs, deployment IDs, test results and any operating limitations in the release documents.

The current phase has no confirmed deployment URL or `OPERATIONAL_PASS` result.
