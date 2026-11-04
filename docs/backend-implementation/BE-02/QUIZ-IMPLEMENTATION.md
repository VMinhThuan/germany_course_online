# Quiz Implementation

## Lifecycle

The student API supports start, attempt read, answer selection, submission, result read, and retry. An attempt copies its question/option text and grading configuration into an immutable `gradingSnapshot`. Later changes to the source quiz do not alter earlier attempts or scores.

Only one option may be selected for a question. The selected option must exist in that attempt's frozen question. Attempt reads are owner-scoped; submitted attempts cannot be edited. Scores and correctness are computed on the server using exact decimal arithmetic over Decimal128 values; the client cannot submit a score.

Submission runs in the existing MongoDB transaction helper and updates only an IN_PROGRESS attempt. A second/concurrent submission returns the same frozen result. Retry creates a distinct attempt and leaves the original intact. Optional `Idempotency-Key` values (8–128 characters) make start/retry requests replay-safe; the database key fields/index are a documented technical extension.

## Answer disclosure

Start, in-progress read, and answer-save responses contain only question/option labels and the learner's selected option IDs. They do not contain correct-option IDs, correctness, explanations, or point values. The `QuizAttempt` DTO is the same safe projection after submission.

After submission, the result includes score, maximum score, correct count, total count, and a nullable `passed` value. When the attempt's frozen `showCorrectAnswers` is true, the result includes a review with selected/correct options, correctness, explanations, and points. When false, review is an empty array. This review behavior follows the recommended BE-00 interpretation and remains **PROVISIONAL** pending owner confirmation.

`passScorePercent` determines `passed` when configured; otherwise `passed` is `null`. The score is still recorded for every submitted attempt. Whether any submission or only a passing result completes the quiz exercise is unresolved, so submission currently does **not** complete exercise or lesson progress automatically. Manual completion of a QUIZ remains rejected.

## Verified behavior

Replica-set tests cover attempt creation/replay, no pre-submit answer-key leakage, invalid option rejection, option replacement, ownership denial, frozen question text after source quiz edit, exact decimal score, simultaneous and duplicate submission, review disclosure, retry creation/replay, and no implicit progress completion. See [TEST-RESULTS.md](TEST-RESULTS.md).
