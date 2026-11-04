# Database Fields and Indexes

No new top-level MongoDB collection was introduced. Existing collections and models are extended for CMS/account behavior.

## BE-03B fields

- `media_assets`: lifecycle `uploadStatus`, `uploadExpiresAt`, `deletedAt`, and integer `referenceRevision` support pending upload, verification, safe deletion, and concurrent-reference guards.
- `lessons` and `exercises`: media-association revision fields support serialized association writes where used by the existing relation models.
- `user_sessions`: `lastActiveAt` is initialized at login and advanced on refresh so the self-service session summary does not mislabel session creation time as the last activity.
- Existing `users`, `audit_logs`, `enrollments`, `lesson_assets`, `exercise_assets`, `quizzes` and `quiz_attempts` collections are reused. Quiz attempts retain their own immutable grading snapshot.

## Admin query indexes in the current schemas

- `users`: `ix_users_admin_student_list` on `{ role, status, createdAt, _id }`.
- `enrollments`: `ix_enrollments_admin_recent` on `{ status, activatedAt, _id }`.
- `audit_logs`: `ix_audit_logs_admin_recent` on `{ createdAt, _id }`; existing entity and actor timeline indexes support filters.
- `media_assets`: `ix_media_admin_library` on `{ uploadStatus, mediaType, createdAt, _id }`; the provider/storage-key unique index protects generated object identity.

Development/test indexes are created by the existing `ensureIndexes()` flow. `npm run db:indexes` is read-only by default and has an explicitly confirmed staging-only apply path documented in BE-06A. Test setup uses the isolated memory replica set. No Atlas connection or remote index migration occurred. Review existing legacy media rows before enabling uploads; records need valid lifecycle/provider metadata to be managed safely.
