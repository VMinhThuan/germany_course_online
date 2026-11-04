# Requirements Traceability

## Source priority and labels

The precedence is: **latest owner decisions → 17-page LMS PDF → current frontend → previous UI research**. Each design statement is tagged or described as one of:

- **CONFIRMED_BY_OWNER** — the explicit decisions in the BE-00 request.
- **CONFIRMED_FROM_SPEC** — field, enum, behavior, or constraint present in the PDF.
- **FRONTEND_MOCK** — behavior/type exists only in the current demo and is not backend authority.
- **TECHNICAL_RECOMMENDATION** — implementation detail proposed to make the confirmed behavior safe and implementable.
- **OPEN_DECISION** — owner/product input is still needed; no default is silently promoted to a requirement.

## PDF review coverage

All 17 pages were read: text extraction covered narrative/flow pages and the schema pages were visually checked because the PDF tables did not extract reliably as plain text. The PDF names 29 structures: 27 with field schemas and two support tables (`login_events`, `password_reset_tokens`) by name only. The schema pages cover authentication, catalog, lessons/exercises/media, quiz, progress/notes, enrollment/renewal, orders/payments, coupons, email, site settings, and audit history. Page 16 contains flows/routes; page 17 contains constraints, exclusions, and unresolved provider/limits notes.

| Requirement | Authority | Design destination | Disposition |
|---|---|---|---|
| `users`, `user_sessions`; STUDENT/ADMIN; one active student session; new login revokes previous | PDF | 05, 06, 07 | Preserved; Admin session scope open |
| `courses → course_sections → lessons → exercises` and ordering/status/soft deletion | PDF | 04, 05, 06, 09 | Separate referenced collections; exact PDF fields retained |
| Exercise assets and exact lesson/exercise association | PDF + owner | 05, 06, 11 | Separate join collections; access check includes association |
| Answer assets require completion | Earlier PDF wording | Owner decision | **Overridden**: valid enrollment is sufficient; completion remains progress only |
| Quiz single-choice, backend grading, retry, no correct-answer leak before submit | PDF + owner | 07, 11 | Preserved; questions/options and answer snapshot embedded |
| Per-student lesson/exercise progress and notes | PDF | 05, 06, 11 | Separate collections with unique learner/resource keys |
| Course price in VND | Owner | 05, 08, 10 | `courses.price` recommended/confirmed field; Decimal128 storage and decimal-string wire format |
| Manual QR/bank transfer, one `orders` collection, Admin approve | Owner | 05, 09, 10, OpenAPI | Payment-gateway fields/table and webhook excluded |
| Order price snapshots | Owner + PDF | 05, 10 | Immutable course title/duration/total/discount snapshots; proposed base-price snapshot clearly tagged |
| A1.1 free preview by fixed chapter/index | Frontend mock/old sample | 09, 12, 13 | Removed from backend behavior; no IDs or level-specific middleware |
| Voucher/coupon and redemption | PDF | 05, 06, 10 | Server-side validation; atomic usage reservation needed for caps |
| Email log and 7-day expiry reminder | PDF | 05, 09, 10 | Mongo-backed outbox/worker recommendation; failure does not undo business transaction |
| Public settings and admin-managed content | PDF | 03–05, 08, 14 | Public projection excludes secrets; CMS endpoints in Admin scope |
| AI grading, learner upload, livestream, DRM, mobile native app, separate teacher system | Owner exclusions | 13 | Explicitly out of scope |

## Field mapping and explicit omissions

The exact-to-physical mapping is in [04-MONGODB-COLLECTIONS.md](04-MONGODB-COLLECTIONS.md) and every persisted field is cataloged in [05-MONGOOSE-SCHEMA-SPEC.md](05-MONGOOSE-SCHEMA-SPEC.md). `payment_transactions` is the only full PDF schema deliberately omitted. `login_events` and `password_reset_tokens` have no PDF field schema; their proposed minimum fields are marked technical recommendations. Logical `quiz_questions`, `quiz_options`, and `quiz_attempt_answers` remain represented, but are embedded rather than independent collections.

Gateway-specific `orders.paymentProvider` and `orders.providerPaymentId` are omitted because the owner explicitly selected manual transfer. There are no payment callbacks. Fields added beyond the PDF are enumerated in the open-decisions document and the schema source labels.

## Validation boundaries

This is a repository/spec audit, not runtime behavior: the frontend tests and mock scenarios were not run as requested design-only work. The DBX inventory was read only; no LMS database was present on the selected connection. OpenAPI syntax validation is reported after parsing the generated YAML. No deployment, migration, collection creation, commit, or push is part of BE-00.
