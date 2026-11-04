# Live Smoke Test Results

**Status:** Partial read-only smoke completed on Production deployments from implementation SHA `3063a1ee889fb97bf10449925c9faeb1f3685a7e`.

| Request | Result | Interpretation |
|---|---|---|
| Frontend `/` | HTTP 200 | SPA document served |
| Frontend `/courses` | HTTP 200 | Direct SPA route fallback works |
| Backend `/health` | HTTP 200 | Liveness only |
| Backend `/ready` | HTTP 503 `CONFIGURATION_UNAVAILABLE` | Expected: no backend environment variables are configured |
| Backend `/api/openapi.yaml` | HTTP 503 `CONFIGURATION_UNAVAILABLE` | Configuration guard runs before API docs |
| Backend `/api/v1/courses` | HTTP 503 `CONFIGURATION_UNAVAILABLE` | No MongoDB connection attempted without valid configuration |
| Frontend `/api/v1/courses` rewrite | HTTP 302 authentication required | Protected backend rewrite could not be fetched through this authenticated-fetch session; SSO remains enabled |

Frontend deployment `dpl_7YNB57foyzrEDMoMpwuqM8AuWjPz` and backend deployment `dpl_AdRW7A4okNbVxBggNgZSxyzPV1j3` both report `READY`. Requests used Vercel's authenticated-fetch facility and did not create users, send email, exercise payments, or modify MongoDB data. Auth cookies, CSRF, write methods, browser rendering/console, and database readiness were not tested. Do not report `OPERATIONAL_PASS`.
