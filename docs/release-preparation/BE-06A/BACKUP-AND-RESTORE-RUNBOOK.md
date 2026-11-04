# Backup and Restore Runbook

**Status: PREPARED_ONLY. No provider backup was taken and no restore was performed.** MongoDB provider, retention, RPO, and RTO require owner decisions.

## Policy proposal (not an SLA)

- Start with daily encrypted full backups plus provider-supported point-in-time recovery if affordable and compatible with the selected MongoDB plan.
- Retain daily backups for an owner-approved period; a 30-day starting proposal may be reviewed against storage cost and business retention needs.
- Take an additional named checkpoint before every schema/index operation and release with persistent data impact.
- Restrict restore and key access to named operators; encrypt snapshots at rest and in transit; keep recovery keys separate from the database credentials.
- Set and publish measured RPO/RTO only after restore drills. Do not promise recovery times based on configuration alone.

## Before a staging index change

1. Confirm the database name, cluster/replica-set identity, and owner approval.
2. Create a provider-native restorable backup/checkpoint using the selected provider's documented workflow.
3. Record a non-secret checkpoint ID, time, database, operator, and approval ticket.
4. Verify the backup is complete and restorable before passing the checkpoint ID to the index command.
5. Run the read-only index plan, review all conflicts, then separately authorize staging apply.

## Restore rehearsal

1. Restore into an isolated disposable database/cluster with no production application access.
2. Confirm replica-set transaction support and expected collection/index inventory.
3. Validate synthetic account login, public catalog, one learning path, outbox records, and Admin audit entries using approved test fixtures.
4. Compare record counts/checksums for approved fixture collections; do not expose personal data in logs.
5. Record elapsed restore/verification times and gaps. Update RPO/RTO proposals from measured evidence.
6. Keep the source environment untouched until the owner accepts the rehearsal result.

No local backup/restore drill was run: the current test database is an ephemeral in-memory replica set and the repository does not provide a provider backup client. Staging backup/restore verification is **BLOCKED_PENDING_OWNER**.
