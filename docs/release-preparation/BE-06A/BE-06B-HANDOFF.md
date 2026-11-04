# BE-06B Handoff

**Handoff state: prepared for owner decisions; live staging work is BLOCKED_PENDING_OWNER.** Start BE-06B only after an explicit scope/authorization, and keep it separate from production deployment.

## Owner decisions required

1. Static frontend hosting provider and account/region.
2. Persistent Express hosting provider, process count, region, restart policy and shutdown grace.
3. Worker topology: recommended in-process initially, or separately hosted persistent worker with its own approved lifecycle.
4. MongoDB staging provider/cluster, replica set, database name, network allowlist and least-privilege user.
5. Staging frontend hostname, API origin, DNS owner and TLS owner.
6. Private S3-compatible storage provider, staging bucket/region, CORS, IAM, scanning/retention policy.
7. SMTP provider/domain, sender, test mailbox, SPF/DKIM/DMARC owner.
8. Secret-management approach and operators authorized to read/change secrets.
9. Approved initial Admin bootstrap operator, approval-ticket system, account handover and recovery procedure.
10. Approved synthetic test bank/QR details and manual matching/cancellation/refund policy.
11. Backup schedule/retention, encryption/key owner, measured RPO/RTO and restore approver.
12. Logging/monitoring provider, retention, alert thresholds/destinations and on-call owner.
13. Source-control checkpoint approval and branch/commit boundaries for accumulated BE-00–BE-06A work.
14. Explicit staging provisioning/deployment authorization and named release owner.

## Required values (supply through approved secret channels)

- Backend: `NODE_ENV=production`, `PORT`, staging `MONGODB_URI`, `MONGODB_DB_NAME`, unique `JWT_ACCESS_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, exact `APP_ORIGINS`, `COOKIE_SECURE=true`, selected `COOKIE_SAME_SITE`.
- Frontend: public `VITE_API_BASE_URL` set at build time.
- If mail enabled: `SMTP_HOST`, `SMTP_PORT`, optional paired `SMTP_USER`/`SMTP_PASSWORD`, `SMTP_FROM`, `PASSWORD_RESET_URL`.
- If media enabled: complete `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, and approved signed URL TTL.
- One-time Admin operation only: secret-channel values `ADMIN_BOOTSTRAP_FULL_NAME`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_OPERATOR`, plus exact host/database/replica-set confirmations, backup checkpoint, and approval ticket.
- Never send secret values in chat, commit, screenshot, issue, or this handoff document.

## BE-06B go/no-go evidence

Before staging traffic: reviewed source SHA, isolated replica-set connection/transaction check, reviewed index plan and backup checkpoint, Admin bootstrap audit, exact-origin/CORS/cookie test, `/health` and `/ready`, persistent worker, private media, test mailbox, synthetic bank/order acceptance, log redaction, backup/restore rehearsal, smoke-plan results, and rollback rehearsal. No staging result should be inferred from local BE-06A tests.
