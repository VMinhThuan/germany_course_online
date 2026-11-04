# BE-02 Database and Indexes

## Collection changes

The existing BE-01 `courses`, `course_sections`, `lessons`, `media_assets`, and `users` models are reused. BE-02 adds these nine collections with strict Mongoose schemas and ObjectId references:

| Collection          | Main fields and purpose                                                                                                                                                                             | Indexes                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enrollments`       | `userId`, `courseId`, nullable `sourceOrderId`, `activatedAt`, `expiresAt`, `status` (`ACTIVE` / `REVOKED`)                                                                                         | Unique `{userId, courseId}`; access lookup `{userId, status, expiresAt}`; course expiry lookup `{courseId, status, expiresAt}`                                                    |
| `exercises`         | `lessonId`, title/description/instructions, `exerciseType` (`FILE_BASED` / `QUIZ`), `completionMode` (`MANUAL` / `QUIZ_SUBMISSION`), required flag, order, publication state, soft-delete timestamp | `{lessonId, status, deletedAt, sortOrder, _id}`                                                                                                                                   |
| `lesson_assets`     | `lessonId`, `assetId`, role (`LECTURE_VIDEO`, `LECTURE_PDF`, `ATTACHMENT`), optional title, order                                                                                                   | Unique `{lessonId, assetId, assetRole}`; `{lessonId, sortOrder, _id}`                                                                                                             |
| `exercise_assets`   | `exerciseId`, `assetId`, role (`QUESTION_PDF`, `QUESTION_AUDIO`, `ANSWER_PDF`, `SOLUTION_VIDEO`), optional title, order                                                                             | Unique `{exerciseId, assetId, assetRole}`; `{exerciseId, sortOrder, _id}`                                                                                                         |
| `quizzes`           | One `exerciseId`, title/description, nullable `passScorePercent`, `showCorrectAnswers`, embedded questions/options and Decimal128 point values                                                      | Unique `{exerciseId}`                                                                                                                                                             |
| `quiz_attempts`     | Student/quiz/exercise IDs, status, Decimal128 score/max score, counts, embedded frozen grading snapshot and selected/graded answers, start/submit timestamps                                        | History `{userId, quizId, startedAt}`; latest exercise `{exerciseId, userId, submittedAt}`; partial unique idempotency index `{userId, quizId, idempotencyScope, idempotencyKey}` |
| `lesson_progress`   | Student/lesson IDs, status, start/completion/last-access timestamps                                                                                                                                 | Unique `{userId, lessonId}`; `{userId, status}`                                                                                                                                   |
| `exercise_progress` | Student/exercise IDs, status, nullable completion source (`MANUAL` / `QUIZ`), start/completion timestamps                                                                                           | Unique `{userId, exerciseId}`; `{userId, status}`                                                                                                                                 |
| `lesson_notes`      | Student/lesson IDs, content up to 10,000 characters, timestamps                                                                                                                                     | Unique `{userId, lessonId}`                                                                                                                                                       |

The exact index names are declared alongside each schema in `backend/src/db/models/`. `backend/src/db/ensure-indexes.ts` includes the new models in the existing explicit index-creation function. BE-02 does not run `syncIndexes()`, create a production seed, or cascade-delete dependent records.

## Embedded quiz data

Quiz questions and options are bounded embedded subdocuments. Each question is `SINGLE_CHOICE`, has at least two options, exactly one correct option, a nonnegative Decimal128 point value, order, and optional explanation. An attempt copies the question text, options, correctness, points, explanation, pass threshold, and review flag into its own frozen `gradingSnapshot`; later quiz edits do not change that attempt.

`quiz_attempts` also stores optional `idempotencyScope` and `idempotencyKey` fields, excluded from default selects. These are a technical extension for retry-safe start/retry requests, protected by a partial unique index. They are not business fields from the BE-00 data model.

## Enrollment and progress lifecycle

`enrollments.status` remains `ACTIVE` or `REVOKED`; there is no `EXPIRED` status. Expiry is determined by `expiresAt > now`. Progress and notes are keyed by student and resource and are not removed when an enrollment expires. BE-02 adds no enrollment-creation API; integration tests create synthetic enrollments only in the disposable replica set.

## Test database

The integration support clears all nine added collections and runs `ensureIndexes()` against a disposable `mongodb-memory-server` replica set. No Atlas URI or real learner/customer data is used by the BE-02 test suite.
