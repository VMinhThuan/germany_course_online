# Edit history

Each edit writes a `lesson_comment_edits` record containing previous/new content, previous/new revision, editor ID and role, timestamp, optional reason and public-history policy. The current comment update, history insert and applicable Admin Audit Log are one MongoDB transaction.

Student edit authorization checks the original author, active entitlement, undeleted thread, expected revision, and `createdAt + 10 minutes` using server time. The deadline is not reset by earlier edits. A matching normalized body does not add a new revision.

Admin edits have no time limit. They preserve the original `authorId`, set `moderationEditedAt`, keep the full history Admin-only, and add `LESSON_COMMENT_EDITED` to Audit Log. Students may still edit their own comment within the original window, but any history remains private after moderation.
