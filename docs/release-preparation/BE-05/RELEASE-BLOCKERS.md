# Release Blockers

**Release recommendation: NO-GO for production until required external items below are verified.** Local code/test quality is not a substitute for deployed integration evidence.

| Area                             | Status  | Required evidence before release                                                                                               |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| MongoDB production/staging       | BLOCKED | Approved isolated database, replica-set transaction check, network/role review, controlled index rollout, backup restore drill |
| Frontend/API origins and cookies | PARTIAL | Exact deployed-origin CORS, HTTPS, refresh-cookie SameSite/Secure, CSRF and proxy behavior verified in browser                 |
| Media                            | BLOCKED | Provider/bucket/CORS/IAM, signed upload/read, provider verification, private access, deletion and playback tested in staging   |
| SMTP/outbox runtime              | BLOCKED | Approved test mailbox delivery, retry/dedupe observation, durable worker process, shutdown/restart and queue monitoring        |
| Bank/payment operations          | BLOCKED | Owner verifies account and QR; operator proves matching/unmatched/duplicate transfer reconciliation in staging                 |
| Backups and rollback             | BLOCKED | Documented recovery-point policy, restore drill, artifact rollback and separately reviewed data/index rollback                 |
| Logging/monitoring               | BLOCKED | Redacted structured logs, request correlation, error/latency alerts, outbox age/backlog and service-health ownership           |
| Production migration             | BLOCKED | Reviewed index/data change plan and approved backup/checkpoint; no production migration was run                                |
| Human accessibility acceptance   | PARTIAL | Manual keyboard, focus, screen-reader and contrast review; automated axe severe gate is not full conformance                   |
| Local frontend/backend quality   | PASS    | Commands and results in [FINAL-QUALITY-GATES.md](FINAL-QUALITY-GATES.md)                                                       |
| Isolated browser coverage        | PASS    | BE-04 4/4 and BE-05 7/7 on MongoMemory and synthetic accounts                                                                  |

No cloud resources, paid products, Atlas connection, customer assets, real emails, or actual bank transfers were used by this work.
