# BE-02 OpenAPI Contract Changes

## Source and synchronization

The canonical OpenAPI 3.1 contract is `docs/backend-design/BE-00/openapi.yaml`. `backend/openapi.yaml` is an exact file copy consumed by Swagger UI and the runtime OpenAPI endpoint. The validator checks byte-for-byte synchronization, internal references, the 11 BE-01 operations, all 18 BE-02 operation IDs, bearer-security requirements, answer-key disclosure constraints, the media 503 response, the media association `oneOf`, and the lesson note length bound.

## Contract updates

- Replaced open-ended learning hierarchy, exercise, asset, progress, and quiz-review shapes with explicit schemas and closed objects.
- Added explicit safe lesson content, course sections/lessons, lesson/exercise asset metadata, and result-review DTOs.
- Split `LessonCompletion` from nested `LessonProgress`, because only the completion response includes `canComplete`.
- Added nullable `passed` to `QuizResult`; the score/max score stay exact decimal strings through `MoneyDecimal`.
- Kept `QuizAttempt` free of correctness, correct-option, explanation, and points fields.
- Set `LessonNoteRequest.content.maxLength` to 10,000 and documented that recommendation in implementation docs.
- Required exactly one lesson or exercise association in `MediaAccessRequest` and documented media storage `503`.
- Kept existing BE-01 contract operations and DTOs intact.

## Validation evidence

`npm run check:openapi` passed: 67 paths, 834 internal references, 11 BE-01 operations, and 18 BE-02 operations. Contract tests verify all learning operation IDs are authenticated and have the expected 200/201 success envelope, and check that in-progress attempt schemas cannot expose correctness data. The synchronized files had matching SHA-256 hashes during the final verification.
