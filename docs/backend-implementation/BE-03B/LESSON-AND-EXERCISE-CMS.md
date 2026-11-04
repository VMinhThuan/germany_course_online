# Lesson and Exercise CMS

## Operations

| Method | Path | Behavior |
| --- | --- | --- |
| GET/POST | `/api/v1/admin/sections/{sectionId}/lessons` | List and create lessons. |
| PATCH/DELETE | `/api/v1/admin/lessons/{lessonId}` | Allowlisted edit or soft-delete. |
| GET/POST | `/api/v1/admin/lessons/{lessonId}/exercises` | List and create exercises. |
| PATCH/DELETE | `/api/v1/admin/exercises/{exerciseId}` | Allowlisted edit or soft-delete. |

All routes require ADMIN. Writes validate ObjectIds and verify the complete live parent chain, so a lesson cannot be attached to a missing/deleted section and an exercise cannot be attached to a missing/deleted lesson. Lists are paginated, status-filtered, and stably ordered.

## Lesson content

The current typed lesson content shape is `{ version: 1, paragraphs: string[] }`, limited to 64 KiB serialized, at most 100 paragraphs and 4,000 characters per paragraph. Tag-like HTML is rejected. This is a conservative structured-text boundary; rich text, embeds and arbitrary lesson JSON were not added. Existing learner history is preserved on soft-delete.

## Exercise rules

- `FILE_BASED` must use `MANUAL` completion.
- `QUIZ` must use `QUIZ_SUBMISSION`.
- Invalid type/completion combinations are rejected on create and patch.
- A quiz exercise cannot publish before its quiz definition exists.
- A required quiz cannot publish while BE-02 does not complete that exercise after submission.

Delete operations mark records deleted and retain progress, notes, asset associations, and historical attempts. Status changes do not mutate learner progress.
