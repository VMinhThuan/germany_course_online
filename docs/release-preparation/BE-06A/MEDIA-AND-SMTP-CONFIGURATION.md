# Media and SMTP Configuration

**Status: source contracts IMPLEMENTED; provider integration PREPARED_ONLY. No S3-compatible bucket was contacted and no email was sent.**

## Private media storage

Configure all `MEDIA_S3_*` fields together. Production endpoint must use HTTPS. The adapter uses path-style S3 requests, AWS SDK signed PUT/GET, HEAD verification, and DELETE. Signed read URLs use `MEDIA_SIGNED_URL_TTL_SECONDS` (60–900; default 300) and `private, no-store`. Upload intents currently expire after 600 seconds.

| Type  | Accepted MIME       | Max size |
| ----- | ------------------- | -------: |
| Image | JPEG, PNG, WebP     |   20 MiB |
| Video | MP4                 |  250 MiB |
| Audio | MPEG, MP4, WAV, OGG |   50 MiB |
| PDF   | PDF                 |   40 MiB |

The browser sends a single-part PUT to a presigned URL. Configure bucket CORS for the exact staging frontend origin and `PUT`, and allow the content headers actually signed by the provider. Confirm preflight and signed-header equality in the staging browser. Completion performs HEAD and compares content length/type before marking READY. Signed GET is generated only for authorized media. Deletion checks database references first.

Owner checklist: private bucket/no public ACL; least-privilege API credentials; separate staging bucket/keys; HTTPS endpoint; CORS; signed PUT and GET; HEAD; expiry; wrong MIME/size rejection; deletion; browser playback/PDF; credential rotation. Current code does not scan bytes for malware, verify file magic bytes, or guarantee provider-specific read-after-write behavior; configure scanning/retention and verify consistency with the selected provider.

## SMTP

Set `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM` together; set user/password together if the provider requires auth; set `PASSWORD_RESET_URL` when SMTP is configured. Port 465 uses implicit TLS; other ports require STARTTLS. Connection/greeting/socket waits are capped at 10s/10s/30s. Configure SPF, DKIM, and DMARC for the approved sender domain.

BE-06B checklist: approved sender/domain; verified SPF/DKIM/DMARC; approved test mailbox; password reset link and expiry; Admin transfer notification; Student approval/cancellation/enrollment notification; retries and FAILED backlog; restart/lease recovery; sender and recipient allowlists; no real customer addresses.

No live credentials, provider DNS records, bucket policy, or transport test were configured here.
