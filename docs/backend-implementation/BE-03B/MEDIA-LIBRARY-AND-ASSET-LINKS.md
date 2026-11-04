# Media Library and Asset Links

## Operations

BE-00 operations:

- `POST /api/v1/admin/media-assets/upload-intents`
- `POST /api/v1/admin/media-assets/{assetId}/complete-upload`
- `DELETE /api/v1/admin/media-assets/{assetId}`

Minimum CMS extensions:

- `GET /api/v1/admin/media-assets` for paginated library search/filter.
- `GET`, `PUT`, and `DELETE /api/v1/admin/lessons/{lessonId}/assets[/{assetId}]`.
- `GET`, `PUT`, and `DELETE /api/v1/admin/exercises/{exerciseId}/assets[/{assetId}]`.

All are ADMIN-only. Unlinking requires `assetRole`, so it removes only the requested role association when one asset is linked more than once.

## Upload lifecycle

The API validates an allowlisted MIME type and size before requesting an upload URL: image up to 20 MiB, video 250 MiB, audio 50 MiB, PDF 40 MiB. It generates an opaque storage key and a 10-minute upload intent. Completion performs provider `HEAD` and compares content length and MIME metadata with the intent; only then does the asset become READY and appear in the Admin library.

Supported roles are checked against media type. Course thumbnail/banner and site logo/hero require images; intro video requires video. Student avatar references require a ready PUBLIC image. Lesson/exercise association writes also lock the media row in the same transaction, so a concurrent delete cannot pass its reference check.

Deletion rejects any asset still referenced by course settings, site settings, a Student avatar, lesson, or exercise. On successful provider deletion it marks the record DELETED. Provider failures return a truthful 503 and retain a retryable deletion state.

## Provider boundary

`MediaStorageAdapter` provides signed PUT, HEAD and delete operations for the configured S3-compatible implementation. An unconfigured adapter returns 503. Tests use an in-memory fake and do not call a real bucket. Verification checks metadata only; it does not inspect file magic bytes or scan for malware. Storage keys, provider credentials and signed read URLs are not included in Admin asset DTOs.
