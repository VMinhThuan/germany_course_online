# Known Limitations and Blockers

**Current staging status: NO-GO / BLOCKED_PENDING_OWNER.** BE-06A preparation does not establish deployed integration readiness.

- No frontend/API hosting provider, plan, region, hostname, or DNS was chosen.
- No persistent backend host or shutdown grace was tested. Initial recommendation is one persistent Express process plus in-process worker.
- No MongoDB staging cluster, staging credentials, network allowlist, backup, restore, or remote index plan was run.
- Initial Admin bootstrap is locally tested only. Staging operator, secret channel, approval ticket and account handover are not supplied.
- No S3-compatible provider/bucket/CORS/IAM was configured. Malware scanning, file magic-byte validation, retention, and provider consistency remain unresolved.
- No SMTP provider, SPF/DKIM/DMARC, mailbox, delivery, retry alert, or live reset link was tested.
- Static bank/QR details and reconciliation policy are unapproved; no payment integration exists.
- Proxy trust chain, deployed CSP, cross-origin refresh-cookie browser behavior, and staging HTTPS were not tested.
- Pino logs are structured and redact selected common secret field names, but no external log pipeline/redaction review/retention was configured. No metrics endpoint or alerts exist.
- Backup retention, encryption ownership, RPO/RTO, restore drill, rollback owner and recovery authorization remain open.
- Source-control checkpoint is accumulated/uncommitted and must be reviewed. BE-06A forbids staging, commit, push, and deploy.
- Automated axe and unit/E2E evidence do not replace manual keyboard, screen-reader, security, or real-browser deployed review.

Review [BE-06B-HANDOFF.md](BE-06B-HANDOFF.md) for owner choices and prerequisites.
