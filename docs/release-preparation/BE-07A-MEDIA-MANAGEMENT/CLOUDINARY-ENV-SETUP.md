# Cloudinary environment setup

## Runtime

Set backend environment variables in the backend hosting environment. Never place the API Secret in Vite variables, browser storage, MongoDB, repository files, issue text, or build logs.

```dotenv
MEDIA_PROVIDER=CLOUDINARY
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_PDF_FOLDER=lesson-pdf
CLOUDINARY_AUDIO_FOLDER=quiz-audio
CLOUDINARY_FOLDER_MODE=dynamic
MEDIA_SIGNED_URL_TTL_SECONDS=300
```

All three Cloudinary account values are required together. `MEDIA_PROVIDER=CLOUDINARY` requires them. `MEDIA_PROVIDER=S3_COMPATIBLE` continues to require the complete `MEDIA_S3_*` group. Both adapters may be configured so older rows can still be resolved, but only one provider accepts new uploads.

Folders accept slash-separated ASCII letters, digits, `_`, and `-`, and PDF/audio folder paths must not overlap. The application defaults to `dynamic`, which is the default for newly created Cloudinary product environments; set `fixed` only when the account's folder mode is fixed. In Dynamic Folders, `asset_folder` is separate from the stable `public_id`. Confirm the account's mode in Cloudinary before the first upload.

## Migration-only target account

The migration CLI reads the source account from the `CLOUDINARY_*` variables above and target credentials from local operator environment variables:

```dotenv
MEDIA_MIGRATION_TARGET_CLOUDINARY_CLOUD_NAME=
MEDIA_MIGRATION_TARGET_CLOUDINARY_API_KEY=
MEDIA_MIGRATION_TARGET_CLOUDINARY_API_SECRET=
MEDIA_MIGRATION_TARGET_FOLDER_MODE=dynamic
```

These target variables are CLI-only. Set the source and target folder-mode variables to match each respective Cloudinary product environment. Do not set target variables in the frontend or production app runtime. `--confirm-target` must exactly equal the target Cloud Name. Keep real values in an untracked local environment file or secret manager; `.env.example` contains blank placeholders only.

## Provider account prerequisites

Enable the Cloudinary account's authenticated access and PDF support according to the account plan/settings. Configure the required browser origin for protected PDF.js reads. PDF.js may use byte-range requests; confirm CORS and range behavior against the actual account before release.

References: [Cloudinary upload API](https://cloudinary.com/documentation/image_upload_api_reference), [access control](https://cloudinary.com/documentation/control_access_to_media), [PDF delivery](https://cloudinary.com/documentation/ts_how_to_upload_manage_and_deliver_pdf_files).
