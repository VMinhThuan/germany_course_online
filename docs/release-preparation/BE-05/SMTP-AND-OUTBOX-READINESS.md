# SMTP and Outbox Readiness

**Status: PARTIAL / BLOCKED on real SMTP and a durable worker runtime.** Automated tests use `FakeEmailService`; no real mailbox received a message.

The code includes notification templates for transfer reports, purchase/renewal approvals, cancellation, and enrollment grant/revoke/restore/extend. Outbox rows use dedupe keys, attempts, availability and lease data. The backend integration suite verifies expired lease reclaim and does not redeliver an already sent job; existing tests cover retry/failure behavior. The worker claims batches of 10, polls every 5 seconds, applies retry/backoff, and has a stop hook. `backend/src/server.ts` starts it as an in-process interval when email is available.

The current worker is not a safe assumption for a short-lived/serverless request runtime: process termination or suspension can stop polling. Use either (1) a persistent Express host that runs the worker continuously, or (2) a separately deployed persistent worker process consuming the shared MongoDB outbox. In both cases preserve atomic leases, idempotent dedupe, graceful shutdown, bounded retries, and monitoring. This is a runtime design choice for the owner; no paid host was selected.

Before release, configure SMTP credentials securely, verify SPF/DKIM/DMARC and sender policy, test password-reset and operational emails with an approved test mailbox, confirm message links point to the correct frontend origin, and observe delivery, retry, dead-letter/failure and queue-age metrics. Never use customer addresses in staging tests without approval.
