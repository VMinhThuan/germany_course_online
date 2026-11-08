# Student quiz experience

## Entry and resume

`GET /api/v1/learn/exercises/:exerciseId` now includes safe quiz metadata (`title`, `description`, `questionCount`) and the current learner's latest attempt ID/status. It does not return correct options, explanations, or scoring data. The student entry shows the available metadata and routes to start, continue, or view the latest submitted result.

## Answering

The existing attempt API remains the source of truth. Selection is persisted through the existing answer endpoint. The UI shows saving/saved/error states, prevents a second selection request while one is pending, and restores the last server-confirmed selection if saving fails. Reloaded selections come from the attempt API.

## Submission and results

The existing confirmation, submission, grading, idempotency, retry, and exercise-completion rules are retained. Scores and review data come from the backend. A nullable pass score remains nullable; the UI does not invent a pass threshold. Correct options and explanations are only presented when the submitted-result API permits review.

## Accessibility and responsive behavior

Questions use native radio inputs and labels; navigator buttons expose question number and answered state. Options remain data-driven, and the quiz layout wraps controls on narrow screens.
