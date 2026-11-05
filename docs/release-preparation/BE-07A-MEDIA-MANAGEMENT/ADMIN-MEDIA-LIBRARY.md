# Admin Media Library

Route: `/admin/media`.

## Capabilities

- Search by original filename and filter by media type, provider, and upload status.
- Show type, MIME, size, visibility, provider, status, created date, and reference count.
- Inspect a media record's read-only public ID/resource/delivery metadata and its lesson, exercise, course, user-profile, and site-settings references.
- Request a short-lived preview URL on demand. The preview URL is held in page memory only; API responses are `no-store`.
- Upload files using the active provider's capabilities. S3 uses signed PUT; Cloudinary uses signed multipart POST.
- Validate supported MIME, extension, and byte limits before requesting an intent; show transfer progress, cancel, sanitized errors, and retry using the retained local file.
- Disable delete when the media is referenced or is not `READY`; the backend repeats the reference check inside its transaction and marks deletion state around provider deletion.

## Provider-supported uploads

S3-compatible storage keeps current image, video, PDF, and audio allowlists. Cloudinary uploads PDF and audio only. Current application limits are 20 MiB for images, 250 MiB for video, 50 MiB for audio, and 40 MiB for PDF; Cloudinary's Admin choices are PDF/audio.

The Admin UI never displays a Cloudinary API Secret or raw signed upload response. A signed upload signature is intentionally sent to the browser as a short-lived upload instruction; it must not be logged or persisted.

## Delete behavior

If reference count is above zero, remove or replace the associations through their owning workflow first. Delete remains subject to the backend's final check to cover race conditions. If provider deletion fails after the tombstone transition, the record stays non-ready for operator recovery; do not erase the Mongo record manually.
