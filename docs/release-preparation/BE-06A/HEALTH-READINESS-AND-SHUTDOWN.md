# Health, Readiness, and Shutdown

**Status: IMPLEMENTED and LOCALLY_TESTED. Staging probe behavior remains PREPARED_ONLY.**

| Endpoint      | Behavior                                                                                                                         | Use                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET /health` | Returns `{ status: "ok" }`; does not query MongoDB or external providers.                                                        | Liveness: process can answer HTTP.                          |
| `GET /ready`  | Checks `mongoose.connection.readyState === 1`; returns 200 `{ status: "ready" }` or 503 `NOT_READY` with a safe generic message. | Readiness: API's required database dependency is connected. |

The readiness policy treats MongoDB as critical for API operations. SMTP and S3 are not readiness dependencies: safe public/catalog/auth endpoints can still operate when either optional provider is unavailable. Provider-specific operations return safe errors, while email notifications remain durable in the Mongo outbox. This avoids routing failure for unrelated endpoints. The probe intentionally reveals no host, URI, set name, credentials, or stack trace.

## Shutdown behavior

`server.ts` handles SIGINT/SIGTERM once. `closeHttpServer()` closes the HTTP listener and drains in-flight HTTP requests, then awaits the background worker stop, then disconnects MongoDB. The worker stops its timer and waits for its current poll. SMTP connection/greeting/socket timeouts are bounded at 10s/10s/30s; graceful completion still depends on host termination grace exceeding the active operation window.

**LOCALLY_TESTED:** liveness/readiness 200/503 responses, sanitized payload, listener closure, worker-stop-before-database-disconnect ordering. **NOT_RUN:** container/orchestrator signal delivery, long-running request drain, real SMTP timeout, or provider readiness on staging.
