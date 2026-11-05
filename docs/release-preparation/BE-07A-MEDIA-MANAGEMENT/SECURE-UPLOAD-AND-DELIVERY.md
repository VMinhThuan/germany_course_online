# Secure upload and delivery

## Upload

1. An authenticated Admin requests an upload intent.
2. Backend validates the allowlisted MIME/type/size, generates a unique canonical ID, creates a `PENDING` row, and returns provider-specific instructions.
3. Browser uploads directly to the provider. S3 uses PUT; Cloudinary uses multipart POST with a backend signature, API key, `type=authenticated`, fixed `public_id`, and `overwrite=false`.
4. Backend looks up the object using the persisted provider and checks public ID, resource type, authenticated delivery, byte count, format, and expected MIME mapping.
5. Only a matching object becomes `READY`.

The API Secret never leaves the backend. A Cloudinary upload API key/signature appears in the short-lived browser upload request by design; do not log its fields or store the signature.

## Learner delivery

Learners call `POST /learn/media-access` with the owning lesson or exercise. The backend checks entitlement and the saved association before signing the read. Provider is selected from the persisted row. The Cloudinary helper creates authenticated download URLs with `expires_at`; an authenticated delivery URL without an expiry must not be treated as temporary.

Admin previews use `POST /admin/media-assets/{assetId}/preview-access` and `Cache-Control: private, no-store`. Do not put signed URLs in MongoDB, query logs, reports, frontend source, or analytics.

## Provider errors

Missing provider configuration returns a media unavailable response. Upload completion never trusts browser-reported size or upload success. Storage keys are not accepted from the browser as arbitrary paths; only the saved intent supplies them.

References: [signed upload signatures](https://cloudinary.com/documentation/authentication_signatures), [authenticated delivery](https://cloudinary.com/documentation/control_access_to_media).
