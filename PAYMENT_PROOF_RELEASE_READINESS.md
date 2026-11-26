# VietQR Payment Proof — Release Readiness Audit

Audit date: 2026-11-26  
Runtime: Node.js 22.21.1 LTS  
Conclusion: **NO-GO FOR PRODUCTION**

## Conclusion

The implementation passes the isolated unit, integration, build, and browser E2E gates. Production release is still blocked because the configured production provider for new payment-proof uploads could not be verified. The checked local environment has no `MEDIA_PROVIDER`, complete S3-compatible credentials, Cloudinary credentials, or SMTP variables, and the Vercel environment inventory was not accessible. The E2E storage verification uses a private in-memory test adapter, so it proves application behavior but not the real provider configuration or bucket/account policy.

No production data was modified and no deployment was performed.

## Final production environment verification

Performed on 2026-11-26 with read-only requests only:

| Check | Result | Evidence / limitation |
|---|---|---|
| Backend production health | PASS | `https://paniversedeutsch-backend.vercel.app/health` returned HTTP 200. |
| Backend production readiness | PASS | `/ready` returned HTTP 200 and reported ready. |
| Public course API | PASS | `/api/v1/courses` returned HTTP 200. |
| Frontend production | PASS | `https://germany-course-online-new.vercel.app/` returned HTTP 200. |
| Existing private media delivery | PASS | A current course media URL was hosted by `api.cloudinary.com`, used Cloudinary `authenticated` delivery, had a signature and expiry, returned HTTP 200 with `image/png`; changing the signature returned HTTP 401. The observed URL had approximately 299 seconds remaining. |
| Exact active provider for new payment-proof uploads | NOT VERIFIED | Existing persisted course media proves Cloudinary is serving at least one production media asset, but it does not prove that the current payment-proof upload configuration is Cloudinary rather than S3-compatible. Runtime Vercel environment variables were not available to inspect. |
| Real 5 MiB payment-proof upload/read/delete | NOT RUN | No authorized non-production order, provider credential, or isolated production test scope was available. A production write/delete test would violate the requested data-safety boundary. |
| Public-access denial and provider-side cleanup for payment proofs | NOT VERIFIED | Application tests cover private access and cleanup semantics; provider ACL/policy and real object lifecycle were not independently tested. |
| Local storage environment | NOT CONFIGURED | No relevant `MEDIA_*` or `CLOUDINARY_*` names were present in the local process environment or local backend env file. |
| Local SMTP environment | NOT CONFIGURED | No relevant `SMTP_*` names were present locally; no real test email was sent. |
| Vercel environment inventory | NOT ACCESSIBLE | The Vercel CLI is not installed and the available Vercel connector is not connected. No Vercel values were printed or exposed. |

The Cloudinary observation is a delivery-path verification for an existing public course response only. It is intentionally not treated as proof that a new payment-proof object can be written, remains private, or can be cleaned up under the active production configuration.

## Issues found and fixed

- Node 20/22.12 test instability: standardized on `.nvmrc` Node 22.21.1 and constrained the backend Vitest worker count to prevent MongoMemoryServer native-process SIGSEGV/fork storms.
- Payment proof was enforced only by UI in the original regression path: backend confirmation now rejects missing, stale, foreign, expired, malformed, or already-reviewed proofs.
- Rejected attempts now require a newer proof; each confirmation attempt retains its proof reference.
- Replacing/deleting a proof no longer deletes an object referenced by reconciliation history.
- Image verification now reads the bounded object and validates JPEG/PNG/WebP container structure, size, MIME, and signature instead of checking only a short prefix.
- Added private signed-read access for current and historical proofs, with owner/admin authorization and storage-key scoping.
- Added responsive upload/error states, preview, progress, replace/delete controls, double-submit protection, and accessible admin proof UI.
- Added OpenAPI contracts for payment-proof APIs and kept the BE-00 source contract synchronized.
- Fixed a mobile accessibility regression found by axe: the admin password link now has an accessible name.

## Changed files

Backend:

- `backend/src/db/models/order.ts`
- `backend/src/db/models/payment-confirmation.ts`
- `backend/src/db/models/media-asset.ts`
- `backend/src/modules/commerce/{schemas,dto,routes,service}.ts`
- `backend/src/modules/learning/media-storage.ts`
- `backend/src/application.ts`
- `backend/openapi.yaml`
- `backend/scripts/be04-e2e-server.ts`
- `backend/vitest.config.ts`
- `backend/tests/unit/payment-proof-validation.test.ts`
- `backend/tests/unit/media-storage.test.ts`
- `backend/tests/integration/{commerce,be03c-business-logic}.test.ts`
- `docs/backend-design/BE-00/openapi.yaml`

Frontend and test configuration:

- `frontend/src/app/student-lms/commerce-pages.tsx`
- `frontend/src/app/admin/{commerce-pages,shared}.tsx`
- `frontend/src/data/api/{student-repository,admin-repository}.ts`
- `frontend/src/data/student-demo/{product-queries,product-types}.ts`
- `frontend/src/lib/api/types.ts`
- `frontend/e2e/be04-live-api.spec.ts`
- `frontend/playwright.be04.config.ts`
- `frontend/package.json` and `frontend/package-lock.json`
- `.nvmrc`

## APIs

Added or updated:

- `POST /api/v1/orders/:orderId/payment-proof/upload-intents`
- `POST /api/v1/orders/:orderId/payment-proof/complete`
- `DELETE /api/v1/orders/:orderId/payment-proof`
- `GET /api/v1/orders/:orderId/payment-proof`
- `GET /api/v1/admin/orders/:orderId/payment-proof`
- `GET /api/v1/admin/orders/:orderId/payment-proofs/:assetId` for historical attempts
- `POST /api/v1/orders/:orderId/confirm-transfer` now enforces proof server-side for new orders

Upload accepts JPG/JPEG, PNG, and WebP up to 5 MiB. Files are uploaded directly to the configured provider and are never stored as base64 or on Vercel’s filesystem.

## Database schema and compatibility

`Order` adds nullable/backward-compatible fields: `paymentProofRequired`, current proof asset/storage metadata, `paymentProofUploadedAt`, and `paymentProofSubmittedAt`. New orders explicitly set `paymentProofRequired=true`; legacy orders without the field remain distinguishable and are not broken.

`PaymentConfirmation` stores `paymentProofAssetId` and storage key per immutable attempt. `MediaAsset` stores `paymentProofOrderId` and upload lifecycle state. No destructive migration is required; existing index bootstrap handles the added index.

## Test results

| Suite | Result |
|---|---:|
| Backend unit | 12 files, 57 passed, 0 failed |
| Backend integration | 8 files, 87 passed, 0 failed |
| Backend full | 21 files, 158 passed, 0 failed |
| Frontend Vitest | 36 files, 209 passed, 0 failed |
| Playwright BE04 isolated browser suite | 14 passed, 0 failed — 7 desktop + 7 mobile |
| Backend typecheck, lint, format, build | PASS |
| Frontend typecheck, lint, build | PASS |
| OpenAPI validation | PASS — 96 paths, 1,197 internal references |

The frontend test run emitted a jsdom canvas implementation warning from an existing test dependency; it did not fail or weaken any assertion.

## Security verification

Verified in code, unit/integration tests, and isolated browser E2E:

- owner checks, admin-only access, IDOR rejection, order-state/expiry checks;
- MIME allowlist, extension matching, actual image signature/container checks, 5 MiB limit, malformed/truncated rejection;
- upload intent expiry, ownership binding, storage-key scoping, concurrent state CAS, idempotent confirmation/approval/rejection;
- private signed read URL with `private, no-store`; tampered signed token returned 404 in E2E;
- historical proofs are retained when referenced by an attempt;
- no proof image is attached to email messages.

Not verified against a real production provider: S3-compatible bucket policy, Cloudinary authenticated delivery policy, provider-side direct-upload behavior at 5 MiB, provider outage/retry behavior, and provider-side orphan cleanup.

## E2E screenshots

Generated by the final 14/14 Playwright run:

- [Desktop student payment proof](frontend/test-results/be04-isolated/be04-live-api-guest-studen-a2cdd-se-isolated-Express-MongoDB-chromium-be04-isolated/payment-proof-student.png)
- [Desktop admin proof review](frontend/test-results/be04-isolated/be04-live-api-guest-studen-a2cdd-se-isolated-Express-MongoDB-chromium-be04-isolated/payment-proof-admin.png)
- [Mobile student payment proof](frontend/test-results/be04-isolated/be04-live-api-guest-studen-a2cdd-se-isolated-Express-MongoDB-mobile-chromium-be04-isolated/payment-proof-student.png)
- [Mobile admin proof review](frontend/test-results/be04-isolated/be04-live-api-guest-studen-a2cdd-se-isolated-Express-MongoDB-mobile-chromium-be04-isolated/payment-proof-admin.png)

## Environment and Vercel readiness

Node engine is `>=22.12.0 <23` in both packages; `.nvmrc` pins `22.21.1`. Both Vercel projects use `npm ci`; no new frontend environment variable is required.

The live read-only check observed Cloudinary authenticated delivery for an existing course media asset. The active provider configuration for payment-proof writes is still not established because Vercel environment variables could not be inspected. Do not assume that the observed delivery URL is sufficient to certify the upload path.

Production must have one real private provider configured before release:

- S3-compatible: `MEDIA_PROVIDER=S3_COMPATIBLE`, `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, and optionally `MEDIA_SIGNED_URL_TTL_SECONDS`.
- Or Cloudinary: `MEDIA_PROVIDER=CLOUDINARY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and the existing folder settings.

Before deployment:

1. Configure the provider in a non-production Vercel environment with a private bucket/account policy.
2. Run a real-provider smoke test: upload a valid 5 MiB-bound image, reject MIME spoofing, inspect a signed URL, verify expiry, test replacement, and verify cleanup/history retention.
3. Configure and test SMTP/admin notification delivery and outbox retry in staging.
4. Run the full quality gates again, review provider logs for secret/signed-URL leakage, then deploy through the existing Vercel projects.

## Access and configuration required to finish the live verification

No credentials should be sent in chat or committed to the repository. The following access is required:

- Read-only Vercel project access for the frontend and backend Production/Preview environment-variable names and configuration metadata; values must remain masked.
- An approved non-production Vercel environment or isolated test project with a disposable test account/order. Do not use a real production order or enrollment.
- A provider account configured through Vercel secrets. For S3-compatible storage: `MEDIA_PROVIDER`, `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, and optionally `MEDIA_SIGNED_URL_TTL_SECONDS`. For Cloudinary: `MEDIA_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, plus the existing folder settings.
- Permission to write, read, and delete only an isolated prefix such as `payment-proofs/release-readiness/<run-id>/`, and permission to inspect the resulting object visibility without changing bucket policy.
- An approved recipient or SMTP test sink for one notification test. Required names are `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `ADMIN_NOTIFICATION_EMAIL`.

With that access, the remaining live test must upload a synthetic image at the 5 MiB boundary, verify direct upload and provider-side private visibility, read it through a short-lived signed URL, verify expiry and tamper rejection, exercise replacement and deletion, confirm historical objects are retained when referenced by reconciliation, test cleanup of an unlinked object, and remove every disposable test object afterward. No proof image should be attached to email.

## Remaining risks and limits

- Real storage security is the release blocker; this audit intentionally does not mark GO based only on the in-memory adapter.
- SMTP delivery was covered through the outbox/business tests and fake E2E email service, but real provider delivery and inbox receipt were not verified.
- Production Vercel environment-variable state is not independently verified in this run because the Vercel connector is not connected and the CLI is unavailable.
- Existing Cloudinary signed delivery was verified read-only, but active payment-proof upload configuration, provider ACL/private mode, real 5 MiB direct upload, provider outage/retry behavior, and provider-side orphan cleanup remain unverified.
- The screenshot files are Playwright test artifacts and are not production assets.
- Bank receipt is never treated as proof that funds arrived; only admin reconciliation approves and creates enrollment.
