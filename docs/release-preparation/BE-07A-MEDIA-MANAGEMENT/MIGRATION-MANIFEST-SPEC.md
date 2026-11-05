# Migration manifest specification

Schema version: `1`. The JSON is strict: unknown fields are rejected. It contains no source URL, target URL, API key, API Secret, signature, provider asset ID, or credential-bearing metadata.

```json
{
  "schemaVersion": 1,
  "generatedAt": "ISO-8601 timestamp",
  "sourceCloudName": "source-account-name",
  "exclusions": {
    "totalScanned": 0,
    "excludedS3": 0,
    "excludedNonReady": 0,
    "excludedNonPdfAudio": 0,
    "excludedInvalidMetadata": 0
  },
  "items": [
    {
      "assetId": "24-character Mongo ObjectId",
      "sourcePublicId": "lesson-pdf/unique-id",
      "mediaType": "PDF",
      "mimeType": "application/pdf",
      "fileSize": 1024,
      "resourceType": "image",
      "deliveryType": "authenticated",
      "format": "pdf"
    }
  ]
}
```

Allowed media are PDF/audio only. Public IDs use safe ASCII path segments; they cannot contain schemes, hosts, dots, query strings, or backslashes. PDF uses `image`; audio uses `video`; delivery is `authenticated`. File size is bounded by the application PDF/audio limits. `targetPublicId` is the same as `sourcePublicId` and is derived by the CLI; it is not separately trusted from input.

The exclusion counters plus included item count must equal `totalScanned`. Duplicate asset IDs or public IDs reject the manifest. Always run `validate-manifest` before any migration command.
