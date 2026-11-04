# Media Upload and Access

## Student playback/access

Student asset associations are listed by the authorized learning API. `apiStudentRepository` requests a short-lived signed URL from `POST /learn/media-access` for each asset. It returns either a real URL and expiry or an explicit unavailable view model. A failed signature does not become a fabricated video/PDF URL; storage keys are not rendered.

The E2E environment intentionally has no media provider and returns `503 MEDIA_STORAGE_UNAVAILABLE`. The tested UI explains that media storage is not configured while preserving text and quiz interactions. Playback itself is not claimed as verified.

## Admin upload workflow

`frontend/src/app/admin/media-settings-pages.tsx` calls `createMediaUploadIntent`, uploads the selected file to the intent URL with progress and abort support, calls `completeUpload`, then lets Admin manage lesson/exercise associations and role. Unfinished/failed transfers show an error; no asset is declared ready by client-side optimism.

The actual upload/signing workflow depends on S3-compatible storage credentials, bucket CORS, expiry and provider completion semantics. No production file was uploaded. E2E used only a synthetic metadata fixture and a `.test`/reserved URL.
