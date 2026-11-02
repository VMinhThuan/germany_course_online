# Phase 2B Handoff

## Current state

Phase 2A provides public A01/C01/C02/C03 routes and a safe typed demo repository. The production build can render these routes without importing the development showcases or LMS scenario fixtures. All public pages consume repository query hooks; the three-section client manifest is isolated from V3 enums and DTO claims.

## Decisions and evidence needed before live integration

1. Confirm published public-course endpoint method, DTO fields, slug behavior, content projection, and error shape from the backend OpenAPI/spec.
2. Confirm the three exact preview `CHAPTER` records and whether the same three chapters are public to guests. Confirm course/content hidden/archive behavior.
3. Define server-side preview authorization and a public-preview endpoint or equivalent. The query string must remain selection state only.
4. Confirm approved lesson text, video provider, captions/transcripts, media URLs, and licensing. Replace unavailable video only after receiving the approved URL/access contract.
5. Confirm public price and access-duration display policy before adding either to the public model/view.
6. Confirm copy, logo, illustration, typography, and SEO/indexing requirements with product/content owners.

## Implementation steps after confirmation

- Add DTO schemas based on actual responses, then map DTO → frontend course model/view state in a repository adapter.
- Keep the `PublicCourseRepository` port or revise it to follow confirmed operations without moving page components onto API DTOs.
- Add explicit loading/empty/error tests for real adapter responses and preview authorization denials.
- Keep the browser route guard presentation-only; rely on backend authorization for media/content delivery.
- Verify signed media URL expiry/retry behavior if preview media is protected or time-limited.

## Not part of Phase 2A

Authentication, student dashboard, account, full-course learning access, checkout, payment provider, database changes, and deployment remain future work. Do not reuse the developer scenario fixture repository as a production source.
