# Live smoke results

Production deployment, public availability, and authenticated student/admin behavior are tracked separately:

- Frontend/backend deployment URL and commit status: pending push and Vercel production checks.
- MongoDB seed and direct readback: dry-run passed with no writes; final apply is pending production deployment.
- Authenticated Admin and enrolled Student flows: require approved test accounts; no enrollment is created for a real user by this release.
- Required authorization checks (unenrolled student, student-to-admin, and cross-user attempt isolation): not marked passed without authenticated test credentials.
- Screenshots are only recorded when captured from the actual application; no placeholder images are treated as evidence.
