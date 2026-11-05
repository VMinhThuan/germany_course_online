# Migration CLI guide

All commands run from `backend/` and use `npm run media:migrate -- <command>`. The CLI has no default production operation. It was not run against a live account for this phase.

## Commands

```powershell
npm run media:migrate -- export-manifest --out=./media-migration-manifest.json
npm run media:migrate -- validate-manifest --manifest=./media-migration-manifest.json
npm run media:migrate -- preflight --manifest=./media-migration-manifest.json --report=./preflight.json
npm run media:migrate -- dry-run --manifest=./media-migration-manifest.json --report=./dry-run.json
npm run media:migrate -- verify --manifest=./media-migration-manifest.json --report=./verification.json
npm run media:migrate -- copy --manifest=./media-migration-manifest.json --journal=./migration-journal.json --report=./migration-report.json --apply --confirm-target=TARGET_CLOUD_NAME
npm run media:migrate -- resume --manifest=./media-migration-manifest.json --journal=./migration-journal.json --report=./migration-report.json --apply --confirm-target=TARGET_CLOUD_NAME
npm run media:migrate -- report --report=./migration-report.json
```

`export-manifest` requires `MONGODB_URI`, `MONGODB_DB_NAME`, and `CLOUDINARY_CLOUD_NAME`; it only reads `media_assets`. Use a read-only database identity for release inventory. It includes READY Cloudinary PDF/audio and counts excluded S3, non-ready, non-PDF/audio, and invalid rows.

Preflight, dry-run, verify, copy, and resume require source `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`, plus migration target variables documented in [CLOUDINARY-ENV-SETUP.md](./CLOUDINARY-ENV-SETUP.md). Source Cloud Name must equal the manifest; source and target must differ.

## Write guard

`copy` and `resume` require both literal `--apply` and `--confirm-target=<exact configured target Cloud Name>`. Copy concurrency is bounded to 1–8 and defaults to 1. Target upload uses `overwrite=false`; existing target content is hashed and either marked MATCHED or CONFLICT. Conflicts are never overwritten. Resume validates the manifest digest and target identity, then rechecks previous MATCHED entries.

No command deletes source objects. Copy streams bytes, validates provider metadata and file magic, then compares source and target SHA-256. Local journals/reports contain IDs and results only, never credentials or signed URLs. Keep them in a restricted directory.

Reports include `copiedCount`, `alreadyMatchedCount`, `verifiedCount`, `failedCount`, `conflictCount`, `missingCount`, `cutoverReady`, `bytesPlanned`, `bytesCopied`, and `estimatedProviderRequests`. `bytesPlanned` is the remaining source-present/target-missing total at report time; `bytesCopied` sums copies verified by this migration, including earlier journaled runs on resume. The provider request estimate counts nominal metadata/digest/upload calls for the observed state; retries and account-side internal requests can increase the actual count. `cutoverReady` is true only when the non-empty manifest has no missing, conflicting, blocked, or unknown results. Owner approval and live student access checks are still required before an actual cutover.

## Recovery

If the process stops, inspect its report and journal. Correct the underlying access/network issue, re-run `validate-manifest`, then use `resume` with the same manifest and journal and an exact target confirmation. Do not edit a journal by hand to mark an item complete.
