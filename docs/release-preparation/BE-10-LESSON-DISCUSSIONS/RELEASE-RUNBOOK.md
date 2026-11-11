# Release runbook

1. Review this implementation and run the full backend/frontend checks on the release commit.
2. On a verified staging replica-set database, inspect a current backup and index state. Apply the four new collection indexes through the repository's operator-controlled index workflow, then verify the named indexes and text search. Do not run the all-model index command against Production without the repository's normal change/backup approval.
3. Deploy backend and frontend to staging with `LESSON_COMMENTS_ENABLED=true` and `VITE_LESSON_COMMENTS_ENABLED=true`. Verify Admin list/search/detail and audit logs against real staging records.
4. Run the authenticated Student scenarios: enrollment access, anonymous/public comments, nested replies, reactions, ten-minute edit boundary, public history, and subtree delete refresh.
5. Verify anonymous responses contain no author ID/contact fields and Admin responses identify the author. Review moderation-history redaction and transaction behavior under concurrent reply/delete.
6. After staging acceptance and a separate production rollout decision, apply and verify Production indexes under the repository's normal change/backup approval, then deploy with both Student flags set to `true`. Set both flags to `false` for an immediate configuration rollback if needed.

This implementation has not deployed or written to MongoDB. The current DBX connection lists a test database named `paniverse_lms`; this work did not modify it.
