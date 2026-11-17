# Email Outbox Delivery

The LMS no longer depends on a Cron endpoint or a persistent polling worker. After an order/payment-confirmation transaction commits, the application immediately attempts to deliver the durable outbox message through SMTP. The database outbox remains the source of truth and preserves status, attempts, lease, backoff and error details if SMTP is unavailable.

Failed messages are retried explicitly by an authenticated Admin from `GET /api/v1/admin/email-outbox` and `POST /api/v1/admin/email-outbox/:messageId/retry`. The retry operation is compare-and-set protected, so two Admin clicks cannot claim the same failed message concurrently. No Cron schedule is configured or required; no SMTP delivery is claimed unless a real provider/mailbox is configured and tested.
