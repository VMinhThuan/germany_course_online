# Mock Fixture Catalog

All records are fictional, stable, deterministic, and marked as demo content. No real credentials, private user data, licensed external course media, or persisted mock API secrets are included.

## Core A1.1 fixture

- Course ID `course-a11-demo`, code `A1.1`, slug `tieng-duc-a1-1`.
- Section IDs: `a11-chapter-01`, `a11-chapter-02`, `a11-chapter-03`, `a11-chapter-04`, `a11-exam-prep-01`.
- Lesson IDs: `a11-lesson-01` through `a11-lesson-07`.
- Exercise ID `exercise-a11-greeting`; quiz attempt ID `quiz-attempt-a11-demo`.
- Course and lesson titles/text, sample goals, prices, score and user identity are provisional UI fixtures, not approved product content or pricing.
- Mock preview manifest is `MOCK_ONLY`, keyed to exactly `a11-chapter-01`, `a11-chapter-02`, `a11-chapter-03`, all of type `CHAPTER`. It never uses array position or lesson index.
- Original visual assets: `frontend/public/demo-assets/a11-course-card.svg` and `a11-worksheet.pdf`.
- Video/audio have no source URL in the default fixture. PDF uses the original local sample document. No reference website media is copied.

## Required scenario IDs

| ID | Fixture story |
|---|---|
| `anonymous_guest` | No profile/session/enrollment; customer-requested preview presentation. |
| `registered_without_enrollment` | Safe student profile, no enrollment, restricted course state. |
| `active_student` | ACTIVE enrollment, PAID/SUCCESS order, progress and note fixture. |
| `partially_completed_student` | Active enrollment, two completed lesson records and repository-supplied 29% summary. |
| `expired_enrollment` | Enrollment status remains ACTIVE with an elapsed `expiresAt`; repository returns `expired-display`. |
| `payment_pending` | PENDING order/PENDING payment, no enrollment, restricted course state. |
| `payment_failed` | FAILED order/payment, no enrollment. |
| `payment_confirmed` | PAID/SUCCESS order and a separate ACTIVE enrollment fixture. |
| `session_revoked` | Safe session summary with REVOKED status and session error presentation. |
| `invalid_coupon` | Fixture coupon response with status 422; its code is fixture data, not a V3 error code. |
| `quiz_in_progress` | IN_PROGRESS attempt with options but no answer key. |
| `quiz_submitted` | Submitted result with review/retry capabilities explicitly present in the mock result. |

## State isolation

Saving a lesson note, updating a display name, or completing the exercise mutates only the repository instance created for the currently selected demo session. Recreating the repository resets the fixture.

