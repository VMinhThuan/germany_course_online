# API Contract Changes

Canonical contract: `docs/backend-design/BE-00/openapi.yaml`. Runtime contract: `backend/openapi.yaml`, kept byte-for-byte synchronized. The BE-00 planned operations for later work remain in the contract.

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/v1/checkout/quote` | STUDENT | Purchase quote with Decimal string VND values |
| `POST /api/v1/orders` | STUDENT | PENDING order, payment details; optional idempotency replay |
| `GET /api/v1/orders` | STUDENT | Owner-scoped paginated order history |
| `GET /api/v1/orders/:orderId` | STUDENT | Owner-scoped order, payment instructions, and granted enrollment when PAID |
| `POST /api/v1/orders/:orderId/confirm-transfer` | STUDENT | Idempotently records report; remains PENDING |
| `GET /api/v1/admin/orders` | ADMIN | Paginated review context; supports `status` and boolean `paymentSubmitted` |
| `GET /api/v1/admin/orders/:orderId` | ADMIN | Student/course/existing-enrollment review context |
| `POST /api/v1/admin/orders/:orderId/approve` | ADMIN | Atomic PAID transition and grant |
| `GET /api/v1/admin/site-settings` | ADMIN | Editable settings and private payment configuration |
| `PATCH /api/v1/admin/site-settings` | ADMIN | Partial update; bank payment object is validated and audited |

All APIs use the existing success/error envelope, Zod validation, and bearer token middleware. IDs use 24-character ObjectId validation. Order creation rejects client-supplied amount fields because request DTOs are closed. Student order DTOs exclude Admin review fields.

Explicit domain errors include `RENEWAL_NOT_SUPPORTED`, `COUPONS_NOT_ENABLED`, `ZERO_PRICE_UNSUPPORTED`, `PAYMENT_CONFIGURATION_UNAVAILABLE`, `PURCHASE_ALREADY_ENROLLED`, `PENDING_PURCHASE_EXISTS`, `IDEMPOTENCY_KEY_REUSED`, `TRANSFER_NOT_SUBMITTED`, and `ENROLLMENT_ALREADY_EXISTS`.
