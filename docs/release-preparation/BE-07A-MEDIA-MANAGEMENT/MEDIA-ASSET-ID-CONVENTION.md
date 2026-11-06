# Media asset and provider ID convention

## Identities

- **Application asset ID:** MongoDB `MediaAsset._id`; stable across storage-provider migration.
- **Canonical provider key:** `MediaAsset.storageKey`; for Cloudinary this is its `public_id`. Image/video keys omit the extension; raw-file keys include it.
- **Cloudinary `asset_id`:** provider-generated metadata only. It may change after transfer and must not become an application reference.
- **Original filename:** display metadata only; duplicate filenames are allowed and do not determine storage identity.

## New Cloudinary keys

The backend assigns an opaque, unique identifier at intent creation:

- PDF: `<CLOUDINARY_PDF_FOLDER>/<unique-id>`
- Audio: `<CLOUDINARY_AUDIO_FOLDER>/<unique-id>`
- General web content: `<CLOUDINARY_WEB_CONTENT_FOLDER>/<unique-id>`; raw files include a safe file extension in the public ID.

`overwrite=false` is signed into upload instructions. The same filename can be uploaded more than once without collision. A retry must request a new intent if the prior target was created or expired.

## Resource and delivery metadata

| Media | Resource type | Delivery type   | Expected format family         |
| ----- | ------------- | --------------- | ------------------------------ |
| PDF   | `image`       | `authenticated` | `pdf`                          |
| Audio | `video`       | `authenticated` | `mp3`, `m4a/mp4`, `wav`, `ogg` |

The backend verifies public ID, resource type, delivery type, format, and byte count before setting an upload to `READY`. Migration retains the public ID and compares source and target bytes using SHA-256.

Do not expose `storageKey`, `providerAssetId`, API Secret, or signed delivery URLs in normal learner/catalog DTOs. The Admin detail endpoint exposes the public ID to authorized Admins as read-only diagnostic metadata.
