# Live smoke results

Production deployment, public availability, and authenticated student/admin behavior are tracked separately:

- Frontend production: `READY`, commit `e8bbfb2bffb4d992f676014ba918bf5b0b8287c5`, deployment `germany-course-online-5cx3mchxb-nguyen-phi-vus-projects.vercel.app`.
- Backend production: `READY`, same commit, deployment `paniversedeutsch-backend-eliirsbfi-nguyen-phi-vus-projects.vercel.app`.
- MongoDB seed and direct readback: `apply` and separate `verify` both passed; see `QUIZ-SEED-AND-VERIFY.md`.
- Authenticated Admin and enrolled Student flows: require approved test accounts; no enrollment is created for a real user by this release.
- Required authorization checks (unenrolled student, student-to-admin, and cross-user attempt isolation): not marked passed without authenticated test credentials.
- Production authenticated E2E and screenshots: not run; no approved test account was supplied.
