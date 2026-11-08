# API changes

The authenticated `GET /api/v1/me/courses/:courseId` response now includes the outline metadata needed by the accordion for each published lesson:

- `hasVideo: boolean`, derived from the lesson video field or a `LECTURE_VIDEO` association.
- `exercises: { id, title, sortOrder }[]`, queried only for published, non-deleted exercises belonging to lessons in the authorized course.

The course entitlement check still runs before the overview queries. Exercise answers, instructions, protected media, URLs, and full exercise payloads are not included in the course outline response. No MongoDB schema or enrollment/completion behavior changed.

The response contract was updated in both `backend/openapi.yaml` and `docs/backend-design/BE-00/openapi.yaml`, then mirrored in `frontend/src/lib/api/types.ts`. Backend integration coverage asserts that published IDs/titles/order and video availability are present without protected data.
