# Quiz Completion

## Transaction behavior

`POST /api/v1/learn/quiz-attempts/:attemptId/submit` grades against the immutable attempt snapshot. Inside the MongoDB transaction it changes an eligible attempt from `IN_PROGRESS` to `SUBMITTED`, stores the score and per-question result, then upserts the matching `exercise_progress` row to `COMPLETED` with `completionSource: QUIZ`. `startedAt` and `completedAt` are filled only when absent. A failed transaction rolls back both the result and progress change.

Submitting an already submitted attempt returns its frozen result and reasserts the same completion state. A retry creates a new attempt; it does not mutate the previous attempt or remove an existing Exercise completion. The update is keyed by `(userId, exerciseId)`, matching the unique progress index.

## Lesson and publishing behavior

The Quiz `passed` result still uses `passScorePercent`. It does not decide Exercise completion. The existing lesson completion endpoint still requires all currently required exercises to be completed and is not called automatically by Quiz submission. The obsolete `QUIZ_COMPLETION_POLICY_REQUIRED` Admin publication blocker was removed; Quiz definition, answer, hierarchy, and publish validation remain in force.

## Evidence

`backend/tests/integration/learning.test.ts` exercises low and zero scores, a required Quiz unlocking explicit Lesson completion, a lower-score retry preserving the prior Exercise completion timestamp, and concurrent submissions of the same attempt. The BE-03B Admin integration suite also verifies publishing a valid required Quiz.
