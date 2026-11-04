# Known Limitations

- **Storage operations are not live-verified.** No provider was configured for this run. Unconfigured upload/verification/delete returns 503. Fake-adapter tests verify control flow only.
- **Upload verification is metadata-only.** HEAD size and MIME must match the intent; file signatures and malware are not checked.
- **Avatar URLs expire.** A ready PUBLIC image receives a provider-signed URL when available. Without storage delivery, `avatarUrl` is null and the profile itself remains available.
- **Existing media data may need review.** Legacy records must have consistent visibility, provider, storage key and lifecycle status before Admin association/deletion is enabled.
- **Required quizzes remain unpublished.** BE-02 has no completion rule after quiz submission; implementing one requires owner approval.
- **Enrollment administration is read-only.** Grant/revoke/restore, renewals, repurchase rules and payment exceptions remain deferred.
- **No runtime or deployment verification was performed.** Build and integration tests are local evidence only; no Vercel deployment or production DB was touched.

The BE-03B API implementation can pass while operational media readiness remains **PARTIAL** until a real provider is approved/configured and separately verified.
