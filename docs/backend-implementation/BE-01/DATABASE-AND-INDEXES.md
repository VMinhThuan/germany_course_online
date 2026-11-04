# Database Models and Indexes

## Collections implemented

| Collection | Model | Use in BE-01 |
|---|---|---|
| `users` | `User` | Student/Admin identity, password hash, role, status |
| `user_sessions` | `UserSession` | Active/revoked/expired sessions, refresh hash, expiry, device metadata |
| `password_reset_tokens` | `PasswordResetToken` | Hashed, expiring, one-time reset token |
| `login_events` | `LoginEvent` | Successful/failed login audit event |
| `courses` | `Course` | Public published-course projection and Decimal128 price |
| `course_sections` | `CourseSection` | Read-only public outline source |
| `lessons` | `Lesson` | Read-only lesson summary source; `content` hidden from public query |
| `media_assets` | `MediaAsset` | Public metadata source; storage fields private |
| `site_settings` | `SiteSettings` | Singleton public settings projection; payment field private |

No model exposes Admin CMS writes. No seeding occurs at startup.

## Declared indexes

1. `users`: unique normalized `email`.
2. `user_sessions`: `{ userId, status, expiresAt }`; unique `refreshTokenHash`; partial unique `{ userId }` for ACTIVE STUDENT sessions.
3. `password_reset_tokens`: unique `tokenHash`; `{ userId, expiresAt }`.
4. `login_events`: `{ userId, createdAt }`; `{ ipAddress, createdAt }`.
5. `courses`: unique `slug`; unique `code`; `{ status, deletedAt, sortOrder, _id }`.
6. `course_sections`: `{ courseId, status, deletedAt, sortOrder, _id }`.
7. `lessons`: `{ sectionId, status, deletedAt, sortOrder, _id }`.
8. `media_assets`: `{ visibility, mediaType }`; unique `{ provider, storageKey }`.

Mongoose schema declarations contain 15 index definitions. `createIndexes()` ensures declared indexes without dropping unrelated indexes. No TTL index is used for authorization; session and reset-token expiry are checked synchronously by application code.

## Database safety

`MONGODB_DB_NAME` is mandatory and passed explicitly as Mongoose `dbName`; there is no URI database fallback. Development/test reject non-loopback hosts. Test names must include `test`. Production names containing development/test scope labels are rejected. MongoDB must report a replica-set name before the server is considered connected.

The integration suite owns a disposable MongoMemory replica set and test database. No Atlas or DBX connection was used, and no external database was modified.

Production startup does not create indexes. `npm run db:indexes` produces a read-only review plan by default. Applying in local development requires `--apply`; applying remotely is restricted to an approved staging-named database with explicit host, database, replica-set and backup-checkpoint confirmations. The tool reports duplicate-key conflicts and retains extra indexes. BE-06A does not apply any remote index change. Do not run `syncIndexes()`.
