# BE-10 implementation summary

Lesson discussions are implemented across backend, Student UI, Admin moderation, OpenAPI, and tests.

- Student access reuses the existing learning entitlement checks. Student routes and UI are enabled by default; set `LESSON_COMMENTS_ENABLED=false` and `VITE_LESSON_COMMENTS_ENABLED=false` to pause Student discussions.
- Student and Admin responses use separate DTOs. Student responses never include author IDs or contact details; Admin responses include the real author identity.
- Replies support five total levels. Root comments and replies use cursor pagination.
- Student edits use a server-enforced ten-minute deadline and revision checks. Every change is written to immutable edit-history records in the same transaction.
- Admin edits preserve the original author, record the reason and editor in history, write an Audit Log entry, and hide all revision content from Student history APIs after moderation.
- Deletion soft-deletes a comment and its descendants in one MongoDB transaction. Thread mutations serialize on the root comment to prevent visible or orphaned replies during concurrent delete/reply/reaction/edit operations.
- Reactions use a unique `(commentId, userId)` index and return aggregate counts only.
- Shared MongoDB counters enforce per-user Student write limits across serverless instances.

Database state was not changed. Index application and deployment remain separate release steps; this checkout has not been deployed.
