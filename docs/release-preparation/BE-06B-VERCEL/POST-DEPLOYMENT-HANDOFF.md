# Post-Deployment Handoff

## Current action needed

The implementation is pushed to `origin/main`, GitHub Actions `Quality Gates` run #7 passed, and both Vercel Production builds reached `READY` on source SHA `3063a1ee889fb97bf10449925c9faeb1f3685a7e`. Frontend routes and backend liveness respond. Database-backed routes remain unavailable because both Vercel environment inventories are empty; the frontend API rewrite is also protected by SSO.

## Remaining owner setup

1. Confirm the frontend project's exact Root Directory in Vercel Settings; Vite build and SPA route checks pass, but the connector does not return that setting.
2. Through Vercel's secure settings UI, configure only owner-approved Preview/Production values. Use a dedicated approved MongoDB target and exact HTTPS `APP_ORIGINS`; set backend JWT/cookie configuration. Do not copy secrets into source, GitHub Actions, or chat, and do not reuse the URI pasted earlier in chat without confirming its target and rotation status.
3. Verify the protected rewrite in an authenticated browser session while leaving SSO enabled. Then validate GET and auth-cookie/CSRF flows before enabling API-backed student features.
4. Keep `/ready` blocked until an isolated approved MongoDB target is configured and has been separately reviewed. Run safe readiness and public API checks after configuration.
5. SMTP, private media storage, a custom domain/HTTPS, monitoring, backup, and an email-worker schedule remain owner/provider follow-up items. Hobby Cron is unsuitable for frequent email delivery; no paid upgrade was made.

The deployment URLs are confirmed, but this phase does not have an `OPERATIONAL_PASS` result.
