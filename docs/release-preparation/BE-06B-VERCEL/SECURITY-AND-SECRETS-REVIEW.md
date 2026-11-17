# Security and Secrets Review

- Server secrets remain backend-only; `VITE_*` values are public.
- No `CRON_SECRET` is required because no scheduler endpoint is deployed. Manual outbox retry is protected by the existing Admin JWT/role middleware and uses a compare-and-set claim before SMTP delivery.
- Vercel app import does not run the Admin bootstrap or index migration and does not start a persistent polling loop.
- Mongo connection failures produce a redacted 503; no URI or database host is emitted in responses/log fields.
- No remote MongoDB, SMTP, media store, bank/payment service, or real student record was accessed.
- Pre-stage text scan reviewed tracked modifications and untracked text files except the explicitly excluded `.rar`. Four URI-shaped matches are invalid-domain examples or synthetic unit-test fixtures; no real credentials were found. Repeat on the final staged tree before commit.
- Current Vercel environment inventories for both `germany-course-online-new` and `paniversedeutsch-backend` are empty (`hiddenProductionEnvCount: 0`). No settings or values were changed, and no user-supplied MongoDB URI was copied into Vercel.
