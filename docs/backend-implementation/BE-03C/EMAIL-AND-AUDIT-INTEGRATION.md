# Email and Audit Integration

Commerce/Admin transactions write audit and outbox documents alongside the state change. BE-03C adds or uses these templates: `RENEWAL_APPROVED_STUDENT`, `ORDER_CANCELLED_STUDENT`, `ENROLLMENT_GRANTED_STUDENT`, `ENROLLMENT_REVOKED_STUDENT`, `ENROLLMENT_RESTORED_STUDENT`, and `ENROLLMENT_EXTENDED_STUDENT`. Existing transfer-submitted and purchase-approved messages remain supported.

Outbox rows carry the recipient, template data, status, dedupe key, attempts, availability, lease, and delivery metadata. Unique dedupe keys make scheduling repeat-safe. The email worker contains text templates and delegates delivery to the configured email service; local integration tests use `FakeEmailService`. The code does not establish real SMTP delivery or a persistent worker host.

Audit events include the acting Admin/Student, entity, action, selected changed fields and relevant state values. Coupon codes may be shown in Admin order context, but secret bank configuration, password/session hashes, and storage credentials are not part of these DTOs.
