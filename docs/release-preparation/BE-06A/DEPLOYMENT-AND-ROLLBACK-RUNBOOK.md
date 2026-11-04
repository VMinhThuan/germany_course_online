# Deployment and Rollback Runbook

**Status: PREPARED_ONLY. No cloud infrastructure or deployment command was run.** Provider and deployment approval remain owner decisions.

## Build and runtime artifact

Frontend (`frontend/`):

1. Use the committed lockfile and a supported Node version with `npm ci`.
2. Run `npm run check` and `npm run format:check`; build with `npm run build`.
3. Inject only public `VITE_API_BASE_URL` at build time. Do not bake backend secrets into static assets.
4. Serve `dist/` over HTTPS with SPA fallback to `index.html`. Revalidate HTML; immutable-cache content-hashed assets.

Backend (`backend/`):

1. Use Node `>=22.12.0`, reproducible `npm ci`, then `npm run check` and `npm run build`.
2. Inject approved environment/secrets at runtime. Do not bake `.env` or credentials into artifacts.
3. Use the persistent process command `npm start`; it serves Express and starts the in-process email poller.
4. Confirm `/health` and `/ready`, signal handling, outbound Mongo/SMTP/S3 network rules, and shutdown grace.
5. Review/apply staging indexes as a separate checkpointed operation before routing traffic. Production startup intentionally skips index creation.

No Dockerfile is added: no provider/runtime requiring a container was selected, and the current Node process does not need extra OS packages beyond its dependencies.

## Staging release sequence

1. Owner reviews source-control checkpoint and selects hosting, MongoDB, storage, SMTP, DNS, secret and monitoring owners.
2. Provision an isolated staging environment outside BE-06A; use independent staging credentials/data.
3. Build immutable artifacts from a reviewed checkpoint. Record source SHA and configuration version (not secret values).
4. Create and verify database backup, then run index plan and obtain separate apply authorization.
5. Bootstrap first Admin using the dedicated one-time procedure.
6. Configure private media, SMTP and static synthetic bank/QR only after owner approval.
7. Run the BE-06B smoke plan against staging. Record every result and log/monitoring evidence.
8. Obtain explicit owner go/no-go before production work.

## Rollback

- For an application-only defect, route traffic back to the previous known-good frontend/backend artifact pair and verify `/ready` and auth/API smoke checks.
- If frontend/API contracts are incompatible, roll back both together.
- Database/index changes are not automatically reversed by artifact rollback. Preserve extra indexes; do not use `syncIndexes()` or drop data as a generic rollback.
- Restore a database checkpoint only into the owner-approved isolated target, verify data/indexes, then obtain separate authorization before redirecting traffic.
- Record deployment SHA, operator, time, reason, checkpoint, affected services, and validation. No rollback rehearsal has been run.
