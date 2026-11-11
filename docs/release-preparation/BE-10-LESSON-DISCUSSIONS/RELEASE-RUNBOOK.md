# Release runbook

1. Review this implementation and run the full backend/frontend checks on the release commit.
2. Configure `LESSON_COMMENTS_ENABLED=false` on Production and build the frontend with `VITE_LESSON_COMMENTS_ENABLED=false`. Admin management remains available while Student discussions are disabled.
3. On a verified staging replica-set database, inspect a current backup and index state. Apply the four new collection indexes through the repository's operator-controlled index workflow, then verify the named indexes and text search. Do not run the all-model index command against Production without the repository's normal change/backup approval.
4. Deploy backend and frontend to staging with both Student flags off. Verify Admin list/search/detail and audit logs against real staging records.
5. Enable `LESSON_COMMENTS_ENABLED=true` on staging and rebuild the frontend with `VITE_LESSON_COMMENTS_ENABLED=true`, then run the authenticated Student scenarios: enrollment access, anonymous/public comments, nested replies, reactions, ten-minute edit boundary, public history, and subtree delete refresh.
6. Verify anonymous responses contain no author ID/contact fields and Admin responses identify the author. Review moderation-history redaction and transaction behavior under concurrent reply/delete.
7. After staging acceptance and a separate production rollout decision, deploy with both Student flags off. Enable both flags only after production indexes and environment configuration have been verified.

This implementation has not deployed or written to MongoDB. The current DBX connection lists a test database named `paniverse_lms`; this work did not modify it.
