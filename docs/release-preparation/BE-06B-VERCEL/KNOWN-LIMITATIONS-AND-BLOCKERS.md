# Known Limitations and Blockers

1. Existing Vercel frontend project is linked to the repository and tracks `main`, but the connector omits its explicit Root Directory/build settings. Build output indicates Vite/`dist`; the exact dashboard setting could not be read because Windows UI automation did not initialize.
2. The backend project and its domain must be created after `backend/` reaches `origin/main`; then configure the frontend external API rewrite using that verified domain.
3. No production/staging MongoDB URI and target database, JWT secret, exact frontend origin, SMTP provider/mailbox, or media credentials were configured. Until owner-approved values are set, `/health` can pass while `/ready` and API return `503 CONFIGURATION_UNAVAILABLE`; do not report operational pass.
4. Hobby Cron runs at most once per day and may be delayed within the hour. No cron schedule is configured; use the persistent VPS worker or choose a supported higher-frequency option without upgrading automatically.
5. Existing project uses SSO protection for non-custom domains. Keep it enabled; a same-team protected rewrite requires the visitor to be authenticated to the frontend deployment.
6. No paid upgrade, real email, remote database write, media-store operation, bank/payment operation or production LMS enablement is authorized.
