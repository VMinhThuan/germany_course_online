# Admin CMS Browser Validation

**Automated browser result: PASS for the exercised workflow. Human UAT: NOT RUN.** The test signs in as a synthetic Admin and uses the actual CMS forms and backend APIs.

## Evidence

- Creates a draft course and verifies it is not visible at the public slug before publication.
- Edits the course, creates and edits a section, adds and publishes a lesson, and creates a `FILE_BASED` exercise with required instructions.
- Creates a required Quiz, confirms the empty-question client validation is announced, writes one valid single-choice question, and publishes the complete CMS tree.
- Verifies the published public course title through a real HTTP request.
- Grants a synthetic learner an enrollment through the Admin page. The learner opens the published lesson and exercise, completes the file exercise, submits the Quiz with a low score, and becomes eligible to complete the lesson after all required exercises are complete.
- Edits the Quiz after the attempt and confirms the saved result still displays the original question, chosen option, and answer snapshot.
- Soft-deletes the course, checks public lookup returns 404, and verifies the historical enrollment record remains.
- A separate browser journey exercises student search/detail, account block/reactivation, and enrollment grant/revoke/restore/extend.

The browser run caught a real UI/API contract mismatch: backend `createExerciseSchema` requires non-empty `instructions`, while the create form sent an empty string. The form now collects instructions. Quiz validation strings are now rendered directly by `AdminFeedback` rather than mapped to a generic fallback.

## Not demonstrated

This is deterministic automated UAT, not owner sign-off. It does not cover every optional CMS field, every media association, all validation edges, upload interruption, or a human editorial review. Admin role authorization is checked against the backend as well as the route guard; hiding a button alone is not treated as authorization evidence.
