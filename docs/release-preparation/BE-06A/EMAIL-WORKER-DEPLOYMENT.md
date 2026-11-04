# Email Worker Deployment

**Status: IMPLEMENTED locally and PREPARED_ONLY for a live provider. No real email was sent.**

## Current execution model

- `src/server.ts` starts `EmailOutboxWorker` in the same long-lived Express process after MongoDB and HTTP are ready. A serverless invocation that may stop after a response cannot be assumed to run this poller.
- Worker polls every 5 seconds, claims up to 10 due jobs per batch with atomic `findOneAndUpdate`, uses a 60-second lease/token, reclaims expired `PROCESSING` leases, retries up to 5 attempts, backs off from 30 seconds to a 30-minute cap, and marks terminal jobs `FAILED`.
- `dedupeKey` has a unique MongoDB index. It prevents duplicate job scheduling, not exactly-once delivery to SMTP after an ambiguous provider acknowledgement. External delivery is at-least-once from the application's perspective.
- Shutdown clears the poll interval and waits for the active poll before disconnecting MongoDB. SMTP I/O has bounded 10s connection/greeting and 30s socket timeouts.
- With SMTP absent under production semantics, the service is unavailable and the worker does not start; email rows remain pending for later handling. This requires backlog monitoring.

## Initial deployment

Use one persistent backend process for API plus poller. The separate worker design is an optional future scale/failure-isolation improvement; it would need its own process entry point, readiness, shutdown, alerting and a shared durable database, none of which is needed for initial staging. Do not add Redis/broker without evidence.

For BE-06B, use an approved test mailbox; verify successful delivery, dedupe, retry/terminal failure, lease reclaim after restart, and no duplicate business event scheduling. Monitor pending/failed count and oldest pending age. Never log reset links, bodies, SMTP credentials, or full provider errors.
