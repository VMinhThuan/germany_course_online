# Seed and verify

The CLI is `backend/scripts/seed-a11-quizzes.ts`, exposed as `npm run db:seed-a11-quizzes`. It requires the explicit database and both source paths. It accepts `dry-run`, `apply`, or `verify`, and rejects a database/cluster mismatch. It prints database name, IDs, counts, actions, and conflicts only; it never prints the Mongo URI or answer keys.

```powershell
$env:MONGODB_DB_NAME = 'paniverse_lms'
# Set MONGODB_URI through the approved secret source; do not paste it into source or docs.
npm run db:seed-a11-quizzes -- --mode=dry-run --target-db=paniverse_lms --verbkonjugation='D:\SideProject\data\tieng-duc\Quiz Verbkonjugation.xlsx' --irregular='D:\SideProject\data\tieng-duc\Quiz unregelmäßig Verb.xlsx'
npm run db:seed-a11-quizzes -- --mode=apply --target-db=paniverse_lms --verbkonjugation='D:\SideProject\data\tieng-duc\Quiz Verbkonjugation.xlsx' --irregular='D:\SideProject\data\tieng-duc\Quiz unregelmäßig Verb.xlsx'
npm run db:seed-a11-quizzes -- --mode=verify --target-db=paniverse_lms --verbkonjugation='D:\SideProject\data\tieng-duc\Quiz Verbkonjugation.xlsx' --irregular='D:\SideProject\data\tieng-duc\Quiz unregelmäßig Verb.xlsx'
```

The script reuses a matching practice lesson and Quiz, conflicts on a different same-title definition, and never overwrites a mismatched Quiz. Writes go through `AdminService`, retaining the existing per-operation transaction and audit behavior. Re-running after a partial failure re-plans from Mongo and completes only missing compatible steps.

Readback is recorded below after execution. A successful Git push or Vercel build alone is not seed verification.
