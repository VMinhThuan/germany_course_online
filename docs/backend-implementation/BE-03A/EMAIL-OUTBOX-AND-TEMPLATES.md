# Email Outbox and Templates

## Events

- `TRANSFER_SUBMITTED_ADMIN`: inserted in the same transaction as `paymentSubmittedAt`. It stores order code, student summary, course title, exact amount, and submission time. The worker resolves active Admin email addresses at delivery time.
- `ORDER_APPROVED_STUDENT`: inserted in the same transaction as the PAID transition and enrollment. It stores course title, order code, duration, expiry, and a Student course URL.

Both use the BE-01 `EmailService` boundary, extended with typed `sendNotification`. Password-reset delivery remains unchanged. No notification includes a password, access token, bank credentials, or secret.

## Worker semantics

- Mongo-backed `email_logs` outbox; unique dedupe key `{orderId}:{eventType}`.
- Atomic lease for 60 seconds; polling every five seconds; up to ten events per batch.
- At most five delivery attempts; exponential delay starts at 30 seconds and is capped at 30 minutes.
- A confirmed provider response records SENT, provider message ID when available, and `sentAt`.
- Failure records only a sanitized error code/message and either schedules PENDING retry or ends at FAILED.
- If email delivery is unavailable, the worker does not claim jobs; they remain PENDING. The HTTP workflow never reports that email was delivered.
- SMTP is called only after the database transaction commits. An email failure does not undo PAID or enrollment.
- Shutdown stops new polling and waits for an in-flight batch before database disconnection.

The fake transport in tests is not SMTP verification. No SMTP credential or real email address was configured. The current worker runs inside the Express server process; a serverless runtime may freeze/terminate that process and needs a scheduled trigger or separate always-on worker. Monitor PENDING age, attempts, and FAILED counts operationally.
