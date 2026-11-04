# Email Outbox Cron and Worker

Both runtimes use `EmailOutboxWorker.runOnce`; the bounded claim/lease/retry logic remains shared. The persistent VPS starts its five-second polling loop and processes up to ten jobs per batch. Vercel exposes `GET /api/internal/email-outbox/process`, checks `Authorization: Bearer <CRON_SECRET>` with a constant-time comparison, ensures Mongo is connected, and caps one invocation at one job to fit the Hobby 60-second function ceiling. Missing secret or SMTP returns a clear 503; an incorrect secret returns 401. No mail is sent by the test suite or this deployment task.

No `crons` schedule is enabled yet. The connected account is Hobby, whose current Vercel limit is once per day with hour-level timing precision. That cadence is unsuitable as the LMS email delivery worker. The route can be scheduled after the owner chooses an acceptable delivery architecture; the VPS persistent worker is the current operational recommendation. No paid upgrade was made.
