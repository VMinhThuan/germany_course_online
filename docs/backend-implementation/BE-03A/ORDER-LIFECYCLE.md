# Order Lifecycle

```mermaid
sequenceDiagram
  participant S as Student
  participant API as Commerce API
  participant DB as MongoDB
  participant A as Admin
  participant W as Email worker
  participant SMTP as SMTP provider
  S->>API: GET checkout quote
  S->>API: POST order with Idempotency-Key
  API->>DB: Validate course/settings; insert PENDING order snapshot
  DB-->>S: Order code, exact amount, static instructions
  S->>API: POST confirm-transfer
  API->>DB: Transaction: timestamp + deduped Admin email outbox
  API-->>S: Order remains PENDING
  W->>DB: Lease outbox event
  W->>SMTP: Notify active Admin recipients
  A->>API: POST approve
  API->>DB: Transaction: CAS + enrollment + adjustment + audit + student outbox
  DB-->>A: PAID order and active enrollment
  W->>SMTP: Notify Student after commit
```

Allowed business transition in BE-03A is PENDING → PAID, and only an ADMIN can cause it after `paymentSubmittedAt` is present. Creating an order and confirming a transfer both leave the order PENDING and create no enrollment. External bank receipt is checked manually by Admin. If the transfer cannot be verified, the order stays PENDING; no rejection or FAILED operation exists.

Students can read only their own orders. Repeated transfer confirmation returns the same pending order and creates no second logical event. Approval is guarded by status compare-and-set, existing enrollment check, the enrollment pair index, the order/type adjustment index, and outbox dedupe key.

Pending orders have no automated expiry or cancellation operation in this phase. The outstanding-order policy may therefore block another purchase until this order is resolved operationally.
