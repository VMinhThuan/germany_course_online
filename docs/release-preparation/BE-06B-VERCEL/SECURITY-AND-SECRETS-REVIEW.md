# Security and Secrets Review

- Server secrets remain backend-only; `VITE_*` values are public.
- `CRON_SECRET` is optional, validated to at least 32 characters, compared without logging, and fails closed when absent/invalid.
- The protected cron route checks its secret before connecting to Mongo or touching the outbox.
- Vercel app import does not run the Admin bootstrap or index migration and does not start a persistent polling loop.
- Mongo connection failures produce a redacted 503; no URI or database host is emitted in responses/log fields.
- No remote MongoDB, SMTP, media store, bank/payment service, or real student record was accessed.
- Pre-stage text scan reviewed tracked modifications and untracked text files except the explicitly excluded `.rar`. Four URI-shaped matches are invalid-domain examples or synthetic unit-test fixtures; no real credentials were found. Repeat on the final staged tree before commit.
- Existing frontend project environment inventory was previously reported empty; no settings or values were changed. Backend project/environment inventory remains pending project creation. No user-supplied MongoDB URI was copied into Vercel.
