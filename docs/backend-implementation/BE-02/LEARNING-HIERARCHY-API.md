# Learning Hierarchy API

## Resource chain

Student resource authorization follows the persisted hierarchy:

```text
Course (PUBLISHED, not deleted)
└── CourseSection (PUBLISHED, not deleted; courseId matches)
    └── Lesson (PUBLISHED, not deleted; sectionId matches)
        └── Exercise (PUBLISHED, not deleted; lessonId matches)
```

`CHAPTER` and `EXAM_PREP` section types and `LECTURE` and `PRACTICE` lesson types remain supported. Each list uses stable `sortOrder` then `_id` ordering. No A1.1-specific authorization or preview-by-index behavior is present.

## Operations

| Operation                                                 | Response behavior                                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/me/dashboard`                                | Safe profile and current ACTIVE, unexpired course enrollments with calculated progress percentage.                                                                                           |
| `GET /api/v1/me/courses`                                  | Owner-scoped, paginated enrollment rows with optional `ACTIVE` / `REVOKED` status filter.                                                                                                    |
| `GET /api/v1/me/courses/:courseId`                        | Entitled course summary, visible sections/lessons, learner lesson progress, and calculated course progress.                                                                                  |
| `GET /api/v1/learn/courses/:courseId/sections/:sectionId` | Exact course-section association and published lessons.                                                                                                                                      |
| `GET /api/v1/learn/lessons/:lessonId`                     | Safe lesson content, associated lesson media metadata, published exercises, exercise progress, and required-exercise completion summary. Reading the workspace marks the lesson IN_PROGRESS. |
| `GET /api/v1/learn/exercises/:exerciseId`                 | Exercise details, exact associated asset metadata, student progress, and capability flags. Reading the exercise marks it IN_PROGRESS.                                                        |

IDs are validated as 24-character MongoDB ObjectId strings. Responses use the common `{success, data}` envelope. DTOs omit media provider IDs and storage keys; safe lesson content recursively filters sensitive property names and bounds traversal depth and node count.

## Lesson content

The existing `lessons.content` field remains hidden by default in Mongoose and is selected only after the entitlement check. `safeLessonContent()` converts supported JSON values to safe response values and removes keys including `passwordHash`, refresh-token hash, `storageKey`, and secret-access-key variants. The OpenAPI schema describes the value as filtered JSON rather than leaving the entire workspace response open-ended.

## Not included

This phase does not add public/A1.1 preview APIs, enrollment creation, orders/payment, admin publication workflows, frontend adapters, or quiz authoring routes. Existing course and lesson authoring schemas remain outside the student learning module.
