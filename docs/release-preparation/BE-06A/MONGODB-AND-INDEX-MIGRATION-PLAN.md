# MongoDB and Index Migration Plan

**Status: IMPLEMENTED and LOCALLY_TESTED against the disposable MongoMemory replica set. No remote database was contacted and no index was applied remotely.**

## Current safeguards

- `connectMongo()` requires explicit URI and database name, sets `autoIndex: false`, and requires a MongoDB replica set (`hello.setName`) for transactions.
- `server.ts` calls `ensureIndexes()` only outside production semantics.
- `ensureIndexes()` uses Mongoose `createIndexes()` for declared indexes; it does not call `syncIndexes()` or drop undeclared indexes.

## Review workflow

`npm run db:indexes` is read-only by default. It reports `PRESENT`, `CREATE`, `CONFLICT`, `DUPLICATES`, `MANUAL_REVIEW`, and `RETAINED` entries. The plan includes model, collection, index name/key, and a safe note; it does not print database records or the connection URI. Unique-index preflight groups by indexed keys and honors current partial filters. Unsupported array/collation/sparse unique-index shapes require manual review. Extra indexes are never dropped.

Local disposable apply can be tested with `NODE_ENV=development` and a loopback replica set:

```powershell
npm run db:indexes -- --apply
```

Remote staging apply is an explicit later BE-06B operation. It is rejected unless production semantics are active, the configured database name is staging-scoped, and all confirmations match:

```text
npm run db:indexes -- --apply --target-db=<exact-staging-database> --confirm-host=<sorted-host-list-from-uri> --confirm-replica-set=<exact-set-name> --backup-checkpoint=<non-secret-backup-id>
```

Load `MONGODB_URI` and secrets only through the owner-approved runtime secret channel. First run the plan without `--apply`; review the exact target and conflicts. Before apply, obtain a restorable backup and record its non-secret checkpoint ID. The command verifies the actual connected database and replica set, applies only if no blocker exists, then re-plans to verify. If it partially fails, stop, re-plan, preserve current indexes, and have an operator review; do not issue a blanket drop or `syncIndexes()`.

## Database/index verification

BE-06A validates planning against a disposable local replica set and synthetic duplicate `users.email` values. A missing unique email index was reported as `DUPLICATES` without exposing the email. The test restores the local fixture index afterward. Remote staging target, replica set, data conflicts, and post-apply state remain **BLOCKED_PENDING_OWNER / NOT_RUN**.

Index creation is not a data migration rollback strategy. If an index must be removed or changed, require a separate reviewed plan and approval.
