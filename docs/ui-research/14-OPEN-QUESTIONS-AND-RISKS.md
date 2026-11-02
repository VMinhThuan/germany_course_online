# Open Questions & Risks

**Purpose:** prevent a demo or UI state from silently becoming an unapproved business rule. Priority P0 means the answer can materially change core routes, authorization or the primary flow; P1 affects completeness; P2 is refinement. Suggested owners indicate decision roles, not assignments.

## P0 — Resolve before implementing core user journeys

| ID | Question / missing evidence | Why it matters | Suggested owner(s) | Current evidence / safe interim treatment |
|---|---|---|---|---|
| OQ-01 | Which exact A1.1 section records are the first three free chapters? Does chapter map to SectionType.CHAPTER, and can a chapter contain multiple lessons? | Core customer requirement; cannot derive from “first 3 lessons.” | Product + content + backend | Customer says three chapters. V3 has CHAPTER enum but no free flag. Use an explicitly identified mock manifest only; do not make them locked. |
| OQ-02 | How are preview chapters/videos exposed: public endpoint, YouTube URLs/provider, guest access, and access for registered/expired students? | Existing learning routes are described as protected; public media/preview contract is absent. | Product + backend | Treat preview as requested product behavior; backend authorization remains OPEN. |
| OQ-03 | Provide method, request/response DTO, field types/nullability and error examples for all public/student APIs. | Most route methods and 28/30 schema field type/nullability definitions are missing; UI and mocks risk inventing contracts. | Backend | V3 gives a route list/envelopes/statuses but no full DTO or pagination/filter/sort. Define OpenAPI or equivalent. |
| OQ-04 | What exact access matrix applies to DRAFT/PUBLISHED/HIDDEN/ARCHIVED content and guests, owners, expired owners? | Controls screen availability, preview, course archive, hidden lessons and asset access. | Product + backend | V3 says PUBLISHED course purchases, archived stops new sales but owned access remains; hidden/public and preview behavior need specific answers. |
| OQ-05 | Which payment provider is used in production, and what are create-order, redirect/return, webhook delay/status check, cancel and retry contracts? | Needed for checkout states; current environment lists MOCK_GATEWAY sample only. | Product + backend/payment | Never present payment-success until backend reads webhook-confirmed state. |
| OQ-06 | Does API expose expiresAt, server time, access-per-asset result, and renewal result timestamps? What is month-end calendar addition (e.g. Jan 31 + one month)? | Needed for correct expired UI and calendar-month terms. | Backend + product | V3 says preserve activation time and use calendar months; end-of-month overflow policy is not defined. |
| OQ-07 | How do passScorePercent and showCorrectAnswers affect quiz result? Is there a retry limit or pass/fail status? | Changes result page, badges and retry CTA. | Product + backend | V3 requires server grading, snapshot and a new attempt for retry; threshold/reveal/limit details are OPEN. |
| OQ-08 | What does free preview count as for progress/enrollment? Are preview attempts/note state saved? | Avoids progress or paid entitlement side effects for guests. | Product + backend | V3 only defines countsTowardProgress and enrollment; no preview persistence behavior. |
| OQ-09 | Which endpoints return course access, signed media URL and stable denial codes for guest/expired/hidden/not-owned cases? | UI needs access-safe data and correct retry/renewal action. | Backend | V3 protects paid media with short-lived signed URLs; sample TTL is 60 seconds; status/code per case is missing. |

## P1 — Resolve before account/commerce completeness

| ID | Question / missing evidence | Why it matters | Suggested owner(s) | Current evidence / safe interim treatment |
|---|---|---|---|---|
| OQ-10 | What are exact coupon validation rules/errors, max discount math/rounding, user eligibility and concurrent usage failure? | Checkout totals/errors and deterministic fixtures. | Product + backend | Transaction for usageLimit; fixed/percent enums and one coupon/order; fine-grained errors/policy missing. |
| OQ-11 | What are registration fields, email-verification requirement, duplicate-email response, password policy and forgot/reset anti-enumeration copy? | Auth forms and success/error feedback. | Product + backend/security | Auth routes/token table exist; flow validation/detail is not fully specified. |
| OQ-12 | Is session list/revoke exposed for students, or does single-session policy mean no multi-device management UI? | Determines whether I06 is needed. | Product + backend | ONE_ACTIVE_SESSION and student session routes are listed; exact user-facing behavior/method details need confirmation. |
| OQ-13 | What is the provider/currency/callback UX; are partial or multiple payment transactions possible? | Order status screen and receipt fields. | Product + backend | Currency convention is VND; PaymentStatus enum is PENDING/SUCCESS/FAILED; provider placeholder is mock. |
| OQ-14 | Are lesson notes plain text or rich text; what are size/format limits and conflict/save semantics? | Editor type, validation and conflict handling. | Product + backend | One note per user/lesson is unique; field is named content, format is not described. |
| OQ-15 | Are MEDIA_SIGNED_URL_TTL_SECONDS=60 and MAX_UPLOAD_SIZE_MB=100 effective in target environment? What player/storage provider serves YouTube vs paid video? | Media refresh/error UI and upload expectations. | Backend/operations + product | Values exist in V3 environment example only; R2/video provider production choice not verified. |
| OQ-16 | Does an archived course remain open to existing students after enrollment expiry? Are notes/history available when expired? | Account history and access banners. | Product + backend | Spec retains profile/progress/history and stops paid media access; archive/expiry interaction needs detail. |
| OQ-17 | Which APIs list orders/courses with pagination/filter/sort and what does meta contain? | Screen scalability and loading controls. | Backend | Response envelope has meta but its structure is unspecified. |

## P2 — Refine after core contracts

| ID | Question / missing evidence | Why it matters | Suggested owner(s) | Current evidence / safe interim treatment |
|---|---|---|---|---|
| OQ-18 | Should landing/public pages be indexed/SSR, or is Vite client rendering sufficient? | May change framework/hosting route design. | Product/marketing/engineering | V3 names React + Vite; no SSR/indexing requirement was found. |
| OQ-19 | Which font, logo, illustration and course content assets are approved? | Visual identity and accessibility. | Product/design | No production assets supplied in this request; do not reuse Lingoni/GWM assets. |
| OQ-20 | Should free-preview progress appear on dashboard after a student registers? | Continuation and personalization. | Product | Not specified by customer or V3. |
| OQ-21 | What date/number locale is preferred beyond Asia/Ho_Chi_Minh? German content may include German locale strings. | Correct instructional and commerce formatting. | Product/design | V3 specifies timezone display Asia/Ho_Chi_Minh; UI language/localization policy is not specified. |
| OQ-22 | Should contact form, live chat, notifications or marketing consent exist in the first release? | Avoid interactions without APIs/legal copy. | Product/legal | Reference sites show forms, but customer did not request them and no student API is listed. |

## Risk register

| Risk | Likelihood / impact | Mitigation before code |
|---|---|---|
| Preview logic is invented as the first three lessons or a new backend enum | High / High | Define chapter IDs/access contract; keep mock-only manifest separate from V3 enums. |
| UI unlocks content from local state or pending order | Medium / Critical | Backend is authorization source; pending always has no access; route guards are not security. |
| Prisma entity fields are copied to components despite mismatched/missing DTO | High / High | DTO → domain → view-model mapping; publish API contract first. |
| EXPIRED, LOCKED or FREE_PREVIEW added to backend enums based on visuals | Medium / High | Preserve exact enums; derive expired display from expiresAt; obtain explicit preview API decision. |
| Quiz leaks isCorrect or mock hardcodes grading | Medium / Critical | Separate start/result types; server owns score and answer reveal. |
| Calendar month/expiry edge cases show wrong renewal dates | Medium / High | Backend returns computed dates; agree month-end behavior and validate during later implementation. |
| Trial/lifetime/comment behavior is copied from reference | Medium / Medium | Keep as observation only; do not include in requirements or demo. |
| Pastel colors fail contrast when used as text | High / Medium | Use pastel as surface; pair with #173E4C/#31410B and verify rendered states. |
| 60-second signed URL expires during learning | Medium / Medium | Confirm runtime config and retry path; never expose storageKey. |
| API pagination/error DTO gaps block screens late | High / Medium | Define API examples/OpenAPI before real adapter; keep mock repository ports. |

## Decision log before implementation

At minimum, record: (1) exact free chapter IDs and preview access; (2) API DTO/method contract; (3) public and paid access matrix; (4) payment provider and order status-check behavior; (5) quiz result/retry policy; (6) renewal date rules; (7) approved brand assets/SEO strategy. These decisions unblock roadmap phases 1–5 in [13-IMPLEMENTATION-ROADMAP.md](13-IMPLEMENTATION-ROADMAP.md).
