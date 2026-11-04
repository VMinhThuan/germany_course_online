# Exercise and Media Authorization

## Exercise rules

- A FILE_BASED exercise with `completionMode: MANUAL` can be completed through the student completion endpoint.
- A QUIZ exercise cannot be completed through that endpoint; it returns `409 QUIZ_COMPLETION_REQUIRES_SUBMISSION`.
- Exercise reads show the learner's progress, associated file metadata, and `canMarkComplete` / `canViewSolutions` capabilities.
- ANSWER_PDF and SOLUTION_VIDEO assets can be viewed by an enrolled learner before exercise completion, following the latest owner decision. Opening/signing an answer asset does not mark progress complete.
- Exercise asset reads and signing requests require the exact `exerciseId` + `assetId` association and valid course ancestry/entitlement.

## Media role/type validation

`MediaAccessService` only signs an associated asset whose stored media type matches its role:

| Role                                        | Allowed media type                  |
| ------------------------------------------- | ----------------------------------- |
| `LECTURE_VIDEO`, `SOLUTION_VIDEO`           | `VIDEO`                             |
| `LECTURE_PDF`, `QUESTION_PDF`, `ANSWER_PDF` | `PDF`                               |
| `QUESTION_AUDIO`                            | `AUDIO`                             |
| `ATTACHMENT`                                | `IMAGE`, `VIDEO`, `AUDIO`, or `PDF` |

Lesson and exercise associations are queried separately. Supplying an unrelated asset, a different exercise/lesson, or a type-mismatched asset returns not found. Public `media_assets.visibility` alone does not authorize paid-resource access.

## Storage adapter

`MediaStorageAdapter` is injectable. `S3CompatibleMediaStorage` uses the AWS SDK S3 client and presigned `GetObject` URLs, sets the response content type and `private, no-store` cache-control, and uses the configured TTL. Environment settings are optional but all-or-none: endpoint, bucket, region, access-key ID, and secret-access key. Production endpoints must use HTTPS; TTL is constrained to 60–900 seconds with a 300-second default.

No provider credentials or real storage endpoint are present in `.env.example`. If no adapter is configured, or an asset is not stored with provider `S3_COMPATIBLE`, the API returns `503 MEDIA_STORAGE_UNAVAILABLE`. It never fabricates a playable URL. Unexpected provider errors are converted to a generic 503 without exposing credentials or internal object keys.

The integration suite injects a fake adapter only to assert authorization and output shape. It verifies no storage key is returned and the unconfigured adapter returns 503. A real provider, bucket, CDN, media upload pipeline, and real signed URL were not provisioned or tested.
