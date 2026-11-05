# Rollback plan

## Before runtime cutover

If copy or verification fails, leave the active account unchanged. The source is retained. Review the report and journal, fix access or asset issues, and resume with the exact same manifest and target confirmation. Conflicts are not automatically overwritten.

## After runtime cutover

If protected reads fail, restore the previous `CLOUDINARY_*` account configuration through the hosting provider's approved rollback. Do not change media rows or delete target objects as an emergency shortcut. Confirm previous source assets still exist before switching.

Uploads created after the target account becomes active exist only in that target unless separately copied back. Before reverting to source, inventory those post-cutover uploads and either copy/verify them to source with a separately reviewed migration or keep target active until the incident is resolved. The runtime deliberately has no automatic dual-write or account failover.

## Data safety

The CLI has no source-delete operation. It uses `overwrite=false` and reports destination conflicts. A report or journal is evidence, not a database migration. The rollback operator should preserve both accounts until learner access and Admin operations are restored.
