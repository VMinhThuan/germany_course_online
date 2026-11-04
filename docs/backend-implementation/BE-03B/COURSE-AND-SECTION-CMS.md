# Course and Section CMS

## Operations

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/v1/admin/courses` | Paginated search by code/title/slug; optional status. |
| POST | `/api/v1/admin/courses` | Creates a DRAFT course. Code and slug are normalized and unique. |
| GET/PATCH/DELETE | `/api/v1/admin/courses/{courseId}` | Read, allowlisted partial update, or soft-delete. |
| POST | `/api/v1/admin/courses/{courseId}/publish` | Explicit publish after checking the published content tree. |
| GET/POST | `/api/v1/admin/courses/{courseId}/sections` | Paginated list and section creation. |
| PATCH/DELETE | `/api/v1/admin/sections/{sectionId}` | Edit ordering/metadata/status or soft-delete. |

All operations require an authenticated ADMIN. Requests reject unknown fields and malformed ObjectIds. Course price is a whole-VND string converted to MongoDB Decimal128; code is stored uppercase and slug lowercase. Optional artwork references must point to ready media of the expected type.

## Publication and deletion

Course creation always starts as DRAFT. Updating a course cannot set PUBLISHED; the dedicated publish operation is required. Only published, nondeleted content appears through the public catalog. Soft deletion marks the course ARCHIVED and records `deletedAt`; it does not cascade to sections, lessons, enrollments, orders, progress, or attempts. Editing catalog price does not rewrite order snapshots.

Publishing checks the published descendants for valid exercise configuration and quiz definitions. It does not invent a minimum number of chapters, lessons, or videos. A required quiz remains blocked until its completion policy is approved and implemented in BE-02.

Sections support `CHAPTER` and `EXAM_PREP`, explicit status and integer `sortOrder`. Stable sorting uses `sortOrder` then `_id`. Parent existence and soft-delete state are checked on writes.

Important changes are written to the existing append-only audit log using changed-field summaries.
