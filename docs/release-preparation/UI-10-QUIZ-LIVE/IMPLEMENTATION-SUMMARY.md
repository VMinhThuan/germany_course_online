# UI-10 / BE-09 Quiz live release

## Scope

This release reuses the existing Quiz models, student/admin APIs, answer persistence, server grading, attempt snapshots, retry policy, and exercise-completion rules. It adds student entry/resume information, richer result review, admin attempt awareness, Excel preview/import into a local draft, and a guarded Mongo seed CLI.

## Current status

- Frontend implementation: complete; full verification status is recorded in `TEST-RESULTS.md`.
- Backend implementation: complete; full verification status is recorded in `TEST-RESULTS.md`.
- Target data: `paniverse_lms` on `cluster0.arsopo1.mongodb.net`; live write/readback status is recorded in `DATABASE-TARGET-VERIFICATION.md` and `QUIZ-SEED-AND-VERIFY.md`.
- Production deployment and authenticated student/admin smoke: see `LIVE-SMOKE-RESULTS.md`.
- Excel importer does not depend on Cloudinary. Future `import-files` storage remains deferred.

## Release boundary

Only the two workbook quizzes and their dedicated optional practice lesson are seeded. Existing course pricing, access duration, enrollments, lesson/video content, progress history, and existing quiz attempts are outside the write scope.
