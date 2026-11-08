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

## Live readback — 2026-11-09

Apply and verify completed against the approved `paniverse_lms` database after the frontend and backend production deployments for commit `e8bbfb2` reached `READY`.

- Course: `Niveau A1.1` (`6aeb813a2911a4fe56299217`); section: `Lektion 1` (`6aeb813a2911a4fe56299219`).
- Optional practice lesson: `Luyện tập chia động từ` (`6af0c32af1a20d3cb7b7f6e2`), `PUBLISHED`, `countsTowardProgress=false`, sort order `7`.
- `Verbkonjugation`: Exercise `6af0c32bf1a20d3cb7b7f6e4`, Quiz `6af0c32bf1a20d3cb7b7f6e6`, 20 questions, 20 maximum points, `PUBLISHED`, exact workbook match.
- `Unregelmäßige Verben`: Exercise `6af0c32cf1a20d3cb7b7f739`, Quiz `6af0c32df1a20d3cb7b7f73b`, 20 questions, 20 maximum points, `PUBLISHED`, exact workbook match.
- Verification: `complete=true`; two quiz records and all 40 ordered questions verified; no conflicts; quiz attempt count `0`; no existing attempt was modified.
- Idempotence: apply completed its post-write re-plan, then a separate verify run also passed.

The quiz source workbooks remain outside Git. Existing course prices, enrollments, videos, progress records, and lesson content were not part of the seed plan.
