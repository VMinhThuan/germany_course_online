# Known Limitations

1. **Production readiness is PARTIAL.** No deployed-origin behavior was checked and no production database was accessed.
2. **Media provider is not configured.** Upload intents and UI workflow are present, but actual S3-compatible upload/signing/playback cannot be verified. The student UI correctly reports the API's 503.
3. **SMTP/fake email boundary.** Forgot/reset forms call backend endpoints, but delivery, real mailbox verification, persistent worker retries and deduplication are unverified.
4. **Bank operations.** E2E only reports a synthetic test transfer and Admin approval against memory data. Bank details, QR, receipt verification and cancellation/reconciliation process require manual owner validation.
5. **Browser coverage is focused.** The four E2E tests do not yet automate complete renewal approval, all cancellation/coupon capacity cases, every Admin CRUD mutation, cross-Student order denial, or multi-viewport accessibility.
6. **Public media metadata.** `GET /media/{assetId}/metadata` exists in OpenAPI but is not used by current UI because course/settings DTOs carry the display metadata currently needed.
7. **Pagination UI.** Repository adapters send bounded page parameters and preserve the `ApiPage<T>` contract; some list pages currently fetch up to 100 rows rather than exposing a complete server-pagination control.
8. **Build size.** Admin is lazy-loaded, and the latest full build emitted the production chunks shown in the summary; the base `ProductionApp` chunk remains 427.64 kB minified. Consider further route-level splitting if the product adds more workflows.
9. **Model compatibility repair.** Existing model files needed to resolve `mongoose.models` through the installed default Mongoose export to start the isolated Express environment. Keep this narrow change when reconciling backend branch work and retain the backend regression suite.

These are verification/configuration boundaries, not claims that a provider was successfully connected.
