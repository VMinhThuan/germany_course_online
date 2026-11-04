# Auth, Cookie, and Rewrite Verification

**Implementation commit:** `6db968ab7906b267c1e6a02bfbefa382841a1828`
**Production frontend:** `https://germany-course-online-new.vercel.app`

## Anonymous production requests

Requests were sent directly over HTTP without a browser session, authorization header, or cookie. Responses were inspected for status, content type, API envelope, and whether an Express `x-request-id` was present. Cookie values and credentials were not read or logged.

| Request through frontend Production `/api` | Result | Interpretation |
| --- | --- | --- |
| `GET /api/v1/courses?page=1&pageSize=12` | `200 application/json`, `success: true`, Express request ID present; `total: 0`, `items.length: 0` | Public catalog request passed through the rewrite to Express. The catalog currently has no published course items. |
| `POST /api/v1/auth/register` with an invalid body | `400` JSON `VALIDATION_ERROR`, Express request ID present | Request reached Express validation and was rejected before account creation. |
| `POST /api/v1/auth/login` with an invalid body | `400` JSON `VALIDATION_ERROR`, Express request ID present | Request reached Express validation; no real credentials were used. |
| `POST /api/v1/auth/refresh` with valid CSRF marker and Origin but no session cookie | `401` JSON `UNAUTHORIZED`, Express request ID present | Rewrite passed the request to Express; missing session cookie was rejected as expected. No session was created. |
| `GET /api/v1/auth/me` without a Bearer token | `401` JSON `UNAUTHORIZED`, Express request ID present | Protected endpoint remains authenticated. |
| `GET /api/v1/admin/courses` without a Bearer token | `401` JSON `UNAUTHORIZED`, Express request ID present | Admin endpoint remains protected. |
| `GET /api/v1/not-a-route` | `404` JSON `NOT_FOUND`, Express request ID present | Unknown API requests remain API responses and do not fall through to the SPA HTML. |

## Result and remaining auth coverage

- **Public API rewrite:** PASS.
- **Expected anonymous auth protections:** PASS for validation, missing refresh session, `/me`, and admin route behavior listed above.
- **Full `AUTH_PASS` lifecycle:** PARTIAL / BLOCKED. No approved production test account was provided, so login with a real test identity, refresh-cookie rotation, and logout cookie lifecycle were not exercised against Production. No user was created to fill that gap.
- **Vercel SSO:** left enabled; no protection configuration was changed.

Local BE-04/BE-05 end-to-end suites use isolated synthetic test data. Their results are in [TEST-RESULTS.md](TEST-RESULTS.md).
