# Database design

The feature uses dedicated collections and does not write to Lesson or LessonNotes documents.

| Collection | Purpose | Main indexes |
| --- | --- | --- |
| `lesson_comments` | Authorship, content, thread ancestry, revisions, moderation and soft-delete state | Lesson/parent/time, lesson/time, author/time, root/thread, ancestor IDs, moderation and bounded text search |
| `lesson_comment_edits` | Immutable previous/new content, revision number, actor, role, time and moderation reason | Unique comment/revision and comment timeline |
| `lesson_comment_reactions` | One active reaction per user and comment | Unique comment/user, comment/type and user/time |
| `lesson_comment_rate_limits` | Shared per-user fixed-window counters | Unique user/action/window and TTL expiry |

Comments keep immutable `lessonId`, `authorId`, `authorRole`, `parentId`, `rootId`, and `ancestorIds`. Student authorship is retained even when the author chooses anonymity. Root and nested replies never move between lessons or parents.

The MongoDB replica set is required for transactional edits, subtree deletes, reactions and Admin audit writes. Production startup has `autoIndex:false`; the new indexes have not been applied to the connected `paniverse_lms` database. Development/test startup follows the repository's existing non-production `ensureIndexes` behavior.
