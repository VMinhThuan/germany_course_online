# Public Course, Site, and Media APIs

All success responses use one `{ "success": true, "data": ... }` envelope. Errors use `{ "success": false, "error": { "code", "message", "details" }, "requestId" }`.

## `GET /api/v1/courses`

Returns published, non-deleted courses only. Supports:

- `page` (default 1) and `pageSize` (default 20, maximum 100).
- `level` exact filter.
- `q` escaped case-insensitive search over title, short description, and course code.
- `sort`: `sortOrder` (default), `newest`, `title`, `price_asc`, `price_desc`.

Sort fields are a BE-01 allowlist because BE-00 did not specify literals. Every sort includes `_id` as a stable tie-breaker. The response includes item counts based on published, non-deleted sections and lessons.

## `GET /api/v1/courses/:slug`

Returns a published, non-deleted course. The outline includes only published, non-deleted sections and lessons, ordered by `sortOrder` then `_id`. Lesson summaries include public metadata such as title, type, estimated minutes, and sort order. The projection never includes `lesson.content`, quiz answers, solution assets, hidden/draft items, or storage keys.

Referenced thumbnail, banner, and introduction media are included only if their asset is explicitly `PUBLIC` and the association belongs to the published course.

## `GET /api/v1/site-settings/public`

Returns the allowlist: site name, hero copy, contact fields, social URLs, footer copy, and public hero-media metadata. Payment settings are excluded. Missing singleton settings return 404. The current model uses `_id="site"` as the technical singleton key.

## `GET /api/v1/media/:assetId/metadata`

Returns ID, media type, and MIME type only when the asset is `PUBLIC` and directly referenced by a published course or the site settings. Invalid ObjectId input returns 400; missing, private, or unassociated media returns 404. The response never exposes `provider`, `storageKey`, or `externalMediaId`.

## Money and media URLs

Course VND prices are stored as MongoDB Decimal128 nonnegative integer values and serialized through their decimal string representation. A contract test uses a value above `Number.MAX_SAFE_INTEGER`.

BE-01 implements metadata only. It has no upload, signed URL, object-store resolver, or public asset delivery. Therefore `thumbnailUrl` and `logoUrl` are null and `PublicMedia.url` is omitted until a storage/public URL contract is approved and implemented.
