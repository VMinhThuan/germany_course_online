# Media Staging Readiness

**Status: PARTIAL / BLOCKED on a configured S3-compatible provider.** The `.env.example` leaves the `MEDIA_S3_*` settings blank; no provider credentials or bucket were configured for BE-05.

Source review covers upload intent, signed PUT URL, client transfer/progress/abort, completion, provider verification, READY lifecycle, associations, signed GET access, and deletion behavior. The student UI receives `503 MEDIA_STORAGE_UNAVAILABLE` in the isolated environment and shows an explicit unavailable message instead of a fabricated playable URL. BE-05 browser test 7 verifies that failure state.

No real upload, provider HEAD, signed download, media playback, safe object deletion, or customer asset transfer is claimed as PASS.

## Staging checklist

- Approve an S3-compatible endpoint, private bucket, region and object key policy.
- Configure HTTPS, bucket CORS for the exact frontend origin, allowed PUT/GET headers and methods, and least-privilege IAM for sign/verify/delete.
- Confirm signed URL TTL, maximum upload size, accepted MIME types, content-type matching and checksum/provider verification.
- Confirm objects remain private; only authorized API responses may issue short-lived read URLs.
- Exercise intent → upload → complete → provider verification → READY → lesson/exercise association → entitled read in staging with a disposable test asset.
- Verify failed/interrupted uploads cannot be published, deletion is safe and auditable, and lifecycle/cleanup handles abandoned uploads.
- Keep provider keys out of source, browser bundles, logs and documentation.
