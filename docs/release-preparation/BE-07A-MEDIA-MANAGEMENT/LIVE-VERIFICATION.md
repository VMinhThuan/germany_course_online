# Live verification status

**Status: BLOCKED — live Cloudinary verification not performed.** No Cloudinary account credentials or approved test assets were supplied for this phase. No live upload, preview, student download, account transfer, Mongo production write, Vercel environment change, or deployment was run.

## Required before release

- Configure a non-production Cloudinary test account with authenticated delivery and PDF support.
- Upload a known PDF and each supported audio format through the Admin UI; verify signed fields, `overwrite=false`, and backend metadata before `READY`.
- Verify temporary preview/read URLs expire at the reported timestamp and are not cached.
- Confirm Cloudinary CORS and byte-range behavior used by PDF.js, including page navigation and mobile widths.
- Verify learner entitlement and association denial using two accounts with different course access.
- Test provider-specific delete on an unreferenced test asset and rejection on a referenced asset.
- Execute migration against dedicated test source/target accounts using small known PDF/audio bytes; compare SHA-256 and prove conflicts are not overwritten.
- Confirm no secret, signature, full signed URL, or upload response appears in browser console, server logs, analytics, Mongo metadata, or reports.

Only after these checks should the deployment/cutover runbook be approved and performed. This phase does not assert any production or Vercel deployment status.
