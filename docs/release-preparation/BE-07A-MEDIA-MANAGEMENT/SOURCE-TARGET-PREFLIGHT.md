# Source and target preflight

`preflight` performs provider metadata lookups only. `dry-run` runs the same read-only inventory and reports bytes that would need copying. `verify` additionally downloads bytes from both accounts and compares SHA-256 without writing either account. Reports include nominal `estimatedProviderRequests`; it excludes retries and provider-side internal requests. Copy/resume reports also state copied, already matched, verified, failed, conflicting, and missing counts; `bytesCopied` reflects copies verified by the migration, including earlier journaled work during resume.

| Status | Meaning |
| --- | --- |
| `MISSING` | Source or target provider resource is absent. `sourceStatus` and `targetStatus` identify which. |
| `MATCHED` | Source and target metadata, byte counts, media magic, and SHA-256 match. Metadata alone never earns this status. |
| `CONFLICT` | Existing target bytes differ, or verified byte count/hash differs. It is not overwritten. |
| `BLOCKED` | Resource type, delivery type, format, public ID, or manifest metadata is incompatible. |
| `UNKNOWN` | Lookup/digest could not be completed, or both resources exist but hashes were not checked. |

Source metadata and target metadata are read from their named Cloudinary accounts. The CLI derives source download URLs itself from the validated public ID, uses HTTPS only, rejects redirects, and accepts only Cloudinary's download API host. It does not fetch manifest-provided URLs.

Preflight is not a cutover approval. Require a complete report with zero BLOCKED/CONFLICT/UNKNOWN and zero target MISSING before scheduling a controlled cutover. A missing source must be investigated rather than recreated from a filename.
