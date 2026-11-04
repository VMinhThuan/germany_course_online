# Admin Quiz CMS

## Operations

- `GET /api/v1/admin/exercises/{exerciseId}/quiz`
- `PUT /api/v1/admin/exercises/{exerciseId}/quiz`

Both routes are ADMIN-only. The write replaces the current quiz definition in a transaction and emits an audit event containing changed-field names rather than answer content.

## Validation and history

- Single-choice questions only; each question requires at least two options and exactly one correct option.
- Quiz accepts 1–100 questions; each question accepts 2–20 options.
- Points use a bounded decimal string; IDs supplied while editing must belong to this quiz.
- Quiz payload is limited to 200 KiB.
- Student quiz routes remain the BE-02 surface; this Admin route does not weaken their answer-key redaction.

Existing question and option IDs are retained when supplied. BE-02 attempts store a grading snapshot, so editing the current quiz does not rewrite submitted attempt content or grades. Regression tests cover the snapshot and the pre-existing grading flow.

## Completion policy

No required-quiz completion behavior was invented. Publishing a required quiz is rejected with `QUIZ_COMPLETION_POLICY_REQUIRED` until the owner decides whether submission, passing, or review completes it. See the BE-03C handoff.
