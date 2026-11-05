# Known limitations and release risks

- Live Cloudinary behavior is unverified because credentials and test assets were not provided. CORS, Range/206, authenticated URL expiry, PDF support flags, browser audio seeking, and account-plan behavior require live validation.
- Authenticated URL expiry is implemented through Cloudinary's expiring private download API. Cloudinary documentation notes authenticated delivery URLs/signatures alone do not inherently expire; use the emitted `expires_at` and test it on the account.
- PDF.js has no direct print/download controls, but delivered bytes can still be captured by an authorized learner. This is not DRM.
- Cloudinary supports only PDF and audio in this phase. Existing S3 image/video behavior remains available via persisted provider routing.
- Migration is Cloudinary-account-to-Cloudinary-account for READY PDF/audio. It excludes S3, videos, pending/deleted rows, and malformed provider metadata. It does not migrate Mongo data or update provider IDs.
- Migration copy streams through the process. Large accounts need capacity, timeout, rate-limit, and cost review before live use; concurrency defaults to one and is capped at eight.
- Existing Cloudinary authenticated downloads may incur API download/bandwidth costs; measure with the target plan before release.
- Runtime has one active Cloudinary account and no automatic failover or dual-write. Rollback after new target uploads requires accounting for those assets.
- No live media or deployment status is claimed by this implementation.
