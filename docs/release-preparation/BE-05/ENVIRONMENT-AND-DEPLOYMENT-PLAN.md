# Environment and Deployment Plan

**No environment was provisioned and no deployment was executed.** This plan identifies runtime needs without selecting a paid provider.

## Runtime shape

- Build `frontend/` as a static Vite site and host it over HTTPS. Configure the production `VITE_API_BASE_URL` at build time.
- Run `backend/` as a long-lived Express process or another explicitly supported persistent runtime. Do not assume Vercel-style serverless request functions will keep the current in-process outbox polling worker alive. A separate persistent worker is an alternative if it shares durable MongoDB and lease semantics.
- Use MongoDB as a replica set for transactions, with a dedicated database, allowlisted network access, least-privilege credentials, backups and restore drills. Production startup intentionally does not automatically create indexes; `npm run db:indexes` is read-only by default, and its explicitly confirmed apply path is staging-only. See BE-06A for the reviewed process.
- Terminate HTTPS at a trusted proxy/load balancer, configure proxy awareness deliberately, enforce exact `APP_ORIGINS`, credentialed refresh behavior, Secure/SameSite cookie policy and the existing CSRF header for the deployed topology.
- Keep JWT secrets, MongoDB URI, SMTP and S3-compatible keys in the runtime secret manager. Never commit real values or place backend secrets in frontend variables.

## Release operations

1. Build immutable frontend/backend artifacts from a reviewed source checkpoint.
2. Configure frontend origin, API origin and exact CORS allowlist; verify cookie and CSRF behavior from the deployed browser origin.
3. Provision an approved Admin bootstrap path and rotate/remove temporary bootstrap credentials.
4. Apply indexes using an explicit, reviewed migration/checkpoint. Take a restorable backup and record the rollback point first.
5. Configure private media storage, SMTP and persistent worker only after the provider-specific checks in the corresponding readiness documents.
6. Add structured logs with request IDs and redaction, error/latency dashboards, outbox backlog/age alarms, database/storage health checks, and alert ownership.
7. `GET /health` is liveness only. `GET /ready` is already implemented and returns 503 when the MongoDB connection is not ready; it intentionally does not probe SMTP or object storage because those are not required for safe API/catalog operation. Verify the deployed endpoint separately before using it for traffic management.
8. Roll back frontend/backend artifacts together when API contracts are incompatible. Database/index rollback must be a separately reviewed operation; do not use `syncIndexes()` or drop production data as a generic rollback.

Staging must use isolated non-customer records and test mail/bank settings. Production integrations remain blocked until a deployment owner verifies each item.
