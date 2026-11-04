# Learning Workspace and Quiz Integration

## Learning resources

Student routes in `frontend/src/app/auth/routes.tsx` load course trees, sections, lessons, exercises, notes, completion state and course progress through `frontend/src/data/api/student-repository.ts`. The backend is the authority for entitlement, required exercises, lesson completion and progress.

The repository adapts API DTOs to existing domain view models. Protected lesson/exercise results are not synthesized from a course ID, an order, or a local enrollment assumption. Expired and revoked access remains server-authorized.

## Exercise assets

An entitled student can see asset associations regardless of Exercise completion. Each asset requests signed access from `POST /learn/media-access`; `ANSWER_PDF`, `QUESTION_PDF`, audio and solution video are not hidden behind a local “exercise complete” flag. When the storage API returns `503 MEDIA_STORAGE_UNAVAILABLE`, the UI shows a truthful unavailable state and preserves text/quiz usage.

## Quiz behavior

`LearningQuizPage` starts an attempt, loads questions, records selection, submits and routes to the saved result. Result/history/retry use attempt IDs from the backend, and answer review labels are mapped from server DTO labels rather than exposing internal object IDs. `showCorrectAnswers` and permitted review fields are respected.

After any valid quiz submission, including a low score, backend exercise completion is refreshed separately from the Quiz `passed` value. The UI refreshes course/lesson/exercise/quiz query families; it does not mark the entire lesson complete without the backend contract permitting it.

## Browser evidence

The E2E fixture covers a protected lesson denied before order approval, post-approval lesson access, answer metadata visibility before manual exercise completion, 503 media state, manual exercise completion, a low-score quiz, result labels, persistent lesson notes, and eligible lesson completion. Renewal and all quiz edge types still need dedicated browser scenarios.
