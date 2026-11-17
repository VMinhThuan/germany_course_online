# Known Limitations and Blockers

1. Both Vercel projects deploy from `main`. The frontend's explicit Root Directory/build settings are not exposed by the connector; deployed root and SPA routes return 200, but the Settings page value is not independently confirmed. Backend project `paniversedeutsch-backend` uses Express/Node 22.x.
2. Frontend `/api/:path*` targets the backend `git-main` alias. The read-only proxy GET hit Vercel SSO authentication at the destination; keep SSO enabled and verify the proxy in an authenticated browser session before claiming API access.
3. Both Vercel environment inventories are empty. No owner-approved MongoDB target/URI, database name, JWT settings, exact `APP_ORIGINS`, SMTP provider/mailbox, or media credentials are configured. `/health` passes while `/ready` and API return `503 CONFIGURATION_UNAVAILABLE`; this is not an operational pass.
4. Email delivery is intentionally not scheduled by Cron. It is attempted immediately after the transaction commits; failed outbox messages require an Admin retry until a future provider-specific retry mechanism is approved.
5. Both projects use SSO protection for non-custom domains. Keep it enabled; authenticated deployment fetch did not establish a cross-project protected rewrite session.
6. No paid upgrade, real email, remote database write, media-store operation, bank/payment operation or production LMS enablement is authorized.
