# Student comment API

All Student endpoints require an active session, an active account, and current entitlement to a published course, section and lesson. Inaccessible lessons return the existing not-found response. Student routes are enabled by default; set `LESSON_COMMENTS_ENABLED=false` to disable them.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/v1/learn/lessons/:lessonId/comments` | Cursor-paginated root comments; newest or oldest order |
| POST | `/api/v1/learn/lessons/:lessonId/comments` | Create a root comment or nested reply |
| GET | `/api/v1/learn/comments/:commentId/replies` | Cursor-paginated direct replies in chronological order |
| PATCH | `/api/v1/learn/comments/:commentId` | Edit own comment with `expectedRevision`; server enforces ten minutes |
| DELETE | `/api/v1/learn/comments/:commentId` | Delete own comment and its descendants |
| PUT/DELETE | `/api/v1/learn/comments/:commentId/reaction` | Toggle, change, or remove the caller's reaction |
| GET | `/api/v1/learn/comments/:commentId/history` | Public self-edit history only |

Create accepts `content`, optional `isAnonymous`, and optional `parentId`. The server takes `authorId` and role from the access token. Content is trimmed, required, and limited to 2,000 characters. Reactions are `LIKE`, `LOVE`, `HAHA`, `WOW`, and `CLAP`.

`StudentLessonComment` includes safe display name, public reaction totals, `isMine`, and server-calculated capabilities. It never includes `authorId`, email, phone, real name, avatar asset ID, or reaction-user identities. After an Admin moderation edit, Student history returns 404 and the UI uses the moderation label.
