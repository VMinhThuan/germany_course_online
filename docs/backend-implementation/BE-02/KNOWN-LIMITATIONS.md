# BE-02 Known Limitations

## External services and operations

- No MongoDB Atlas or production database was connected. Index creation was verified only against the disposable integration-test replica set; production indexes and backups are not verified.
- No S3-compatible storage provider is configured. `POST /learn/media-access` returns `503 MEDIA_STORAGE_UNAVAILABLE` until a real provider and secure credentials are supplied. The fake adapter is test-only.
- No protected object was uploaded and no actual presigned URL was tested.
- No Vercel project deployment or production API runtime was attempted. Local quality gates do not prove deployability or live service readiness.
- No enrollment-creation API is included. Tests insert isolated synthetic enrollments; a future approved purchase/order flow must create real entitlements.

## Product decisions

- Quiz grading and result retrieval are implemented. `passScorePercent` controls the result's `passed` field when set; a missing threshold yields `null`.
- Post-submit answer review currently follows `showCorrectAnswers`, matching the recommended BE-00 interpretation. This is **PROVISIONAL** pending explicit owner confirmation.
- Quiz submission does not automatically complete `exercise_progress`. The product owner must choose whether submission alone or a passing result completes the exercise. A required quiz therefore cannot currently satisfy lesson completion; required quiz exercises should not be published as completion-blocking until policy and implementation are approved.
- Lesson-note maximum length of 10,000 characters is a technical recommendation, not an official content policy.

## Scope limits

- No orders, payment processing, coupons, renewals, admin CMS CRUD, frontend adapters, production seed, or new infrastructure was added.
- No client/browser end-to-end smoke, API production start, or operational media-provider test was run.
- Existing process-local BE-01 rate limiting remains unchanged.
