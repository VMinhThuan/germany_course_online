# Initial Admin Bootstrap Runbook

**Status: IMPLEMENTED and LOCALLY_TESTED on MongoMemory synthetic data. Remote creation is NOT_RUN and BLOCKED_PENDING_OWNER.**

## Code controls

- No public Admin registration route exists; public registration creates `STUDENT` accounts.
- `npm run db:bootstrap-admin` is a manual script and is not imported by `server.ts` or run during startup.
- Creation requires both `--apply` and `--create-initial-admin`, a production-semantics **staging-named** database, exact host/database/replica-set confirmation, a backup checkpoint, and an operator approval ticket.
- Name, email, password and operator are supplied as one-run environment values by an approved secret/configuration channel. The password is never a command-line argument or printed. Bootstrap variables are removed from `process.env` after reading.
- Password is hashed with Argon2id using the same parameters as auth. User, `ADMIN_BOOTSTRAPPED` AuditLog entry and a unique `initial-admin` marker are written in one transaction. The marker makes the operation one-time and handles concurrent attempts.
- If an Admin, marker, or requested email already exists, the script refuses. It never elevates a Student or resets an existing password.

## Owner-approved staging procedure

1. Name the approved operator and ticket. Confirm the exact staging DB, host list, replica-set name, and a verified backup checkpoint.
2. Inject `ADMIN_BOOTSTRAP_FULL_NAME`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (12–128 characters), and `ADMIN_BOOTSTRAP_OPERATOR` through a short-lived secret channel. Never save them to `.env`, shell history, a ticket, or source control.
3. Load the staging backend variables, then run the explicit command below with values copied from reviewed metadata—not from memory:

   ```text
   npm run db:bootstrap-admin -- --apply --create-initial-admin --target-db=<exact-staging-database> --confirm-host=<sorted-host-list-from-uri> --confirm-replica-set=<exact-set-name> --backup-checkpoint=<non-secret-backup-id> --operator-ticket=<approved-ticket-id>
   ```

4. Check the output for `INITIAL_ADMIN_CREATED`, the expected database, replica set, user ID, and email. Confirm the audit action and marker in the approved staging audit procedure. Output does not contain a password/hash or Mongo URI.
5. Sign in over HTTPS, rotate the bootstrap password through the approved account procedure, verify refresh/logout, and remove the temporary secret values from the secret channel.

If the first Admin already exists or bootstrap partially fails, stop. Do not delete the marker or manually elevate a user. Use a separately approved recovery change with database/audit review. The current tool supports only the initial Admin; provisioning later Admins needs a separately designed, audited owner-controlled procedure.
