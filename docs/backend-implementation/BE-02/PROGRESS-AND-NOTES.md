# Progress and Lesson Notes

## Progress lifecycle

Lesson and exercise progress are unique per student/resource and use `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`.

- Opening an entitled lesson workspace creates or advances that lesson to `IN_PROGRESS` and updates its last-access time.
- Reading an entitled exercise creates or advances its progress to `IN_PROGRESS`.
- A manual FILE_BASED completion writes `COMPLETED`, source `MANUAL`, and a completion time. Repeated requests return the existing completion.
- Lesson completion recomputes all currently published, non-deleted required exercises server-side. Any required exercise not marked complete yields `409 COMPLETION_REQUIREMENTS_UNMET`; optional exercises do not block completion. Repeated lesson completion is idempotent.
- A QUIZ exercise cannot use the manual completion route. Because quiz completion policy remains unresolved, quiz submission does not mark exercise or lesson complete.

## Course aggregation

Course progress is calculated from published, non-deleted lessons in published, non-deleted sections where `countsTowardProgress` is true. The API returns `completedLessons`, `totalLessons`, and a backend-calculated percentage rounded to two decimal places. An empty eligible set returns zero percent. Clients cannot submit counts or percentages.

Progress is stored independently of session and enrollment state. An enrollment expiry blocks future learning/progress API access but does not delete saved progress. The suite checks the aggregate changes from 0 to 100 percent after completing the one eligible synthetic lesson in its fixture.

## Personal notes

`GET` and `PUT /learn/lessons/:lessonId/notes` both require lesson entitlement. MongoDB enforces one note per user/lesson. Updates replace the content, preserve Mongoose `createdAt`, and update `updatedAt`; duplicate-key races during concurrent first writes retry as an update. Notes are owner-scoped and never included in another student's response.

The 10,000-character limit is a **technical recommendation** because no official product limit is defined in the source materials. Zod and the Mongo schema apply the same bound. Empty content is valid and may be stored as the current note.
