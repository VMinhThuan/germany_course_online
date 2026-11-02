# Phase 2A — Known Limitations

- All public copy, course outline, objectives, phrases, and sample lessons in the adapter are provisional demo content pending content-owner review.
- The three preview chapter IDs are based on the Phase 1B customer-requested mock manifest. V3 does not define free preview or guest entitlement, so this is not a security boundary or a backend guarantee.
- No API DTO/method/response schema, preview endpoint, access matrix, media provider, or approved video URL has been supplied. No HTTP adapter was created.
- Price and access duration are intentionally absent from public course data/UI. Registration, checkout, payment, and enrollment are not implemented; the buy CTA only explains this.
- Preview is read-only. It has no saved progress, quiz, exercise submission, note, or account behavior.
- Sample video is unavailable. No real or placeholder playable URL is embedded.
- The Vite SPA is client-rendered; SSR and SEO/indexing requirements remain unconfirmed.
- `Computer Use` review could not be run because its node-repl helper failed during setup. Playwright captures and browser-rendered style inspection were used as the available visual evidence.
- No backend/database changes, deployment, commit, or production-host verification were done. The production build's local preview smoke test verifies only this workspace build.
