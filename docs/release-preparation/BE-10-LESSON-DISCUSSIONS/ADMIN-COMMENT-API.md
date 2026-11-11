# Admin comment API

Admin routes require `authenticate()` and `requireRole("ADMIN")`. They remain available when the Student feature flag is off.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/v1/admin/lesson-comments/summary` | Live totals, recent, anonymous, edited and deleted counts |
| GET | `/api/v1/admin/lesson-comments` | Paginated search and filters for course, lesson, author, privacy mode, status, type and date |
| GET | `/api/v1/admin/lesson-comments/:commentId` | Full author identity, discussion thread, context, reactions and selected-comment history |
| GET | `/api/v1/admin/lesson-comments/:commentId/history` | Full revision history with editor identities |
| POST | `/api/v1/admin/lessons/:lessonId/comments` | Admin-authored root comment or reply |
| PATCH/DELETE | `/api/v1/admin/lesson-comments/:commentId` | Edit any active comment or delete its full subtree |
| PUT/DELETE | `/api/v1/admin/lesson-comments/:commentId/reaction` | Manage the Admin's own reaction |

Admin content search uses the `lesson_comments` text index, not an unbounded regular expression. The UI exposes bounded pagination and ID/date filters. The detail response returns at most 500 entries in one thread; use the paginated list to reach other comments in larger threads.

Admin create, edit, delete and reaction mutations write audit records. Edit history keeps the real editor and optional moderation reason. Audit metadata does not duplicate the comment body.
