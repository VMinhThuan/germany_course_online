# Known Limitations

- Bank details and hosted QR reference have not been configured. Order creation intentionally returns 503 until an Admin supplies and verifies approved data.
- SMTP is not configured. Production notifications stay pending while the email service is unavailable; transient provider errors retry at most five times, then become FAILED for operator follow-up.
- The worker is an in-process polling worker. It requires a persistent Node.js server process. Serverless runtimes need a scheduled invocation or separate worker.
- No production MongoDB was connected and no remote indexes were created. `npm run db:indexes` is read-only by default; remote apply is restricted to an explicitly approved staging target by the BE-06A migration tool.
- Existing enrollment rows, including revoked or expired rows, block new purchase/approval. This avoids resetting access/progress but needs owner policy for future repurchase/renewal.
- A PENDING order has no expiration, cancellation, Admin rejection, or reconciliation flow, and can block another purchase for the same course.
- The code validates an HTTPS QR reference but does not fetch or verify the remote image's content, availability, recipient account, or QR payload.
- No coupon, second-purchase discount, paid renewal, payment gateway, webhook, automatic bank reconciliation, frontend adapter, or Admin UI was implemented.
- BE-02 quiz completion/review decisions and S3 media provider setup remain unchanged and unresolved.
