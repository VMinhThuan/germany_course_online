# BE-00 — Executive Summary

**Status: PASS — design artifacts prepared; no backend implementation or database mutation performed.**

## Outcome

This specification translates the 17-page LMS schema brief, the current typed frontend mock contracts, and the latest owner decisions into a modular Express/TypeScript/Mongoose design. The target is a single deployable modular monolith using Zod, JWT access tokens, refresh sessions, Argon2id, OpenAPI, Nodemailer/SMTP, and S3-compatible storage only where media requires it. MongoDB is the only persistence store. It does not introduce NestJS, SQL, Redis, a payment gateway, webhooks, or microservices.

The PDF contains **27 field-defined tables**, plus names for `login_events` and `password_reset_tokens` without field definitions. All 29 named structures were reviewed. The gateway-specific `payment_transactions` table is deliberately omitted per the owner decision. The proposed physical MongoDB model has **25 collections**: 23 collections mapped from the remaining defined PDF tables after embedding bounded quiz children, plus two auth-support collections whose fields are explicitly marked recommendations.

Three logical PDF tables become embedded subdocuments: `quiz_questions[]` and their `options[]` live inside a bounded `quizzes` document; `quiz_attempt_answers[]` live inside `quiz_attempts` as an immutable grading snapshot. Other independently managed entities remain referenced collections. The complete field mapping, source classification, required/null/default rules, serialization, privacy, soft-delete behavior, and index candidates are in [05-MONGOOSE-SCHEMA-SPEC.md](05-MONGOOSE-SCHEMA-SPEC.md) and [schema-catalog.json](schema-catalog.json).

## Owner decisions applied

- An enrolled learner may read any associated exercise prompt and solution asset before marking the exercise complete. Course entitlement and exact asset association are still checked.
- `courses.price` is added as VND decimal precision and serialized as a decimal integer string. Existing orders use immutable amount/title/duration snapshots.
- V1 payment is static bank QR/manual transfer with `orders` only. Transfer submission remains `PENDING`; only an Admin approval transaction marks it `PAID` and grants/extends enrollment. No payment transaction collection, provider callback, or webhook is designed.
- No A1.1-specific free chapters, section IDs, index-based lesson access, or preview middleware is carried into the backend. Public course details and explicitly public media can be served separately from paid learning content.
- Quiz is single-choice and server-graded; correct-option data is excluded from attempt responses until a result is authorized after submission. Retry creates a new attempt.

## Repository and DBX findings

The repository contains a frontend demo and no backend source tree. The frontend's `PublicCourseRepository`, `AuthRepository`, `StudentRepository`, and `StudentProductRepositories` are mock-backed, and UI state is synchronized through TanStack Query. The checkout mock simulates success/failure; those outcomes do not represent real payment evidence and must be removed from the production adapter. See [12-FRONTEND-API-MAPPING.md](12-FRONTEND-API-MAPPING.md).

DBX exposes the user-named Atlas cluster connection, but its database inventory currently contains only `admin`, `local`, and `sample_mflix`; no LMS database was present. The unrelated `english_course` connection was not used. No collection or document was created or changed. The supplied URI is intentionally absent from all artifacts.

## Main risks and decisions still open

1. `renewal_plans` has no price in the PDF while the frontend needs one; an Admin-maintained `price` is recommended but requires owner approval.
2. The PDF does not define renewal extension rules for end-of-month dates; a UTC month-clamp algorithm is proposed, pending confirmation.
3. The 5% second-purchase discount lacks eligibility, duration, renewal, and coupon-stacking semantics; it must remain disabled until decided.
4. The PDF says one active **Student** session; whether Admin accounts also use a single-session rule is open.
5. SMTP sender/credentials, production origins, object-storage provider/bucket, bank details, Admin bootstrap, and retention periods must be configured outside source control. No real values are invented here.

## Implementation readiness

BE-01 can begin after the implementation team confirms runtime/environment ownership, the Admin session policy, and public media storage/access. Renewal pricing and discount semantics are not prerequisites for BE-01. The 15 design documents plus OpenAPI and schema catalog provide the contract baseline; BE-00 ends here and does not start BE-01.

## Document map

| Area | Document |
|---|---|
| Requirements/source trace | [02](02-REQUIREMENTS-TRACEABILITY.md) |
| Runtime/module architecture | [03](03-BACKEND-ARCHITECTURE.md) |
| Collections and ownership | [04](04-MONGODB-COLLECTIONS.md) |
| Field-level model contract | [05](05-MONGOOSE-SCHEMA-SPEC.md) |
| Relations and indexes | [06](06-RELATIONSHIPS-AND-INDEXES.md) |
| Authentication/security | [07](07-AUTH-AND-SECURITY-DESIGN.md) |
| Endpoint-level contract | [08](08-API-ENDPOINT-CATALOG.md) and [openapi.yaml](openapi.yaml) |
| Rules/transactions/learning | [09](09-BUSINESS-RULE-MATRIX.md), [10](10-ORDER-APPROVAL-AND-TRANSACTIONS.md), [11](11-LEARNING-QUIZ-PROGRESS-DESIGN.md) |
| Frontend/decisions/roadmap | [12](12-FRONTEND-API-MAPPING.md), [13](13-OPEN-DECISIONS-AND-RISKS.md), [14](14-BACKEND-IMPLEMENTATION-ROADMAP.md), [15](15-BE-01-HANDOFF.md) |
