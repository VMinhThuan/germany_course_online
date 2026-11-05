# Cutover runbook

This runbook documents the sequence; no live copy or environment change was performed in BE-07A.

1. Freeze media uploads for the maintenance window or account for all writes made after manifest export.
2. Confirm source and target Cloud Names and use a read-only database identity for export.
3. Export and validate a fresh manifest. Store it and its digest in a restricted release directory.
4. Run preflight and dry-run. Resolve every BLOCKED, CONFLICT, UNKNOWN, and missing-source result.
5. Run `copy` with `--apply`, exact `--confirm-target`, restricted journal path, and bounded concurrency.
6. Run `verify`; require every required row MATCHED with exact byte count and SHA-256.
7. Review output counts and sample PDF/audio opens in a non-production environment. Confirm CORS, Range responses, content type, expiry, Admin preview, and student entitlement checks.
8. Update the single runtime Cloudinary environment account through the approved hosting release process. Keep the source account intact.
9. Validate student lesson/exercise access, admin previews, upload/complete, provider-specific delete, and logs. Do not log signed URLs.
10. Keep the source account available through the rollback window. Only the repository's normal retention policy may decide its later cleanup; this toolkit never deletes it.

The application database keeps the same Mongo asset ID, public ID, and `CLOUDINARY` provider during a Cloudinary account-to-account copy. Environment account selection determines which Cloudinary account serves that ID after cutover. New target-only uploads made after cutover must be accounted for before any rollback.
