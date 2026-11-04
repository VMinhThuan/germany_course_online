# Root Cause Analysis: Vercel API Proxy 401

**Date:** 2026-11-04
**Repository:** `VMinhThuan/germany_course_online`
**Affected production frontend:** `https://germany-course-online-new.vercel.app`

## Finding

The frontend's `/api/*` rewrite targeted a protected backend Git branch deployment alias. An anonymous request to that alias received a Vercel `302` redirect to `https://vercel.com/sso-api`, with a plain-text body and no Express `x-request-id`. The frontend Production hostname also returned this Vercel SSO response for `/api/v1/courses`; the request never reached the Express API.

This response was distinct from an application authorization response. Direct requests to the backend's stable Production domain reached Express: public routes returned JSON `200`, while protected routes without a token returned the API's JSON `401` and an `x-request-id`.

## Before-fix observations

| Request | Result | Evidence |
| --- | --- | --- |
| Backend branch deployment alias `/api/v1/courses` | `302 Found` to `https://vercel.com/sso-api`; `text/plain`; no `x-request-id` | Vercel Deployment Protection intercepted the request before Express |
| Frontend Production `/api/v1/courses` | Same Vercel `302` SSO response | The frontend rewrite forwarded to the protected branch alias |
| Backend stable Production `/api/v1/courses` | `200 application/json`, Express response with `x-request-id` | Public course route was reachable directly |
| Backend `/health` and `/ready` | `200 application/json` | Backend service was available |

The backend project had SSO Deployment Protection configured. No protection setting was changed as part of this fix. The stable Production backend domain was confirmed to belong to the intended backend project and accepted API requests without the branch-alias redirect.

## Source trace

- `frontend/vercel.json` contained the API rewrite used by the frontend deployment.
- `frontend/src/data/api/public-repository.ts` calls the course-list API as a public request (`auth: false`).
- `backend/src/modules/catalog/routes.ts` exposes the course listing without JWT authentication.
- `backend/src/modules/auth/routes.ts` keeps registration/login public, protects refresh with CSRF validation, and protects `/me` with authentication.
- `backend/src/modules/auth/middleware.ts` continues to enforce Bearer JWT, current server-side session, account status, and role checks.
- `backend/src/application.ts` mounts the API routes without a global JWT gate.

## Conclusion

The observed production failure was caused by routing public frontend API calls through a protected Vercel branch deployment hostname. It was not an Express JWT rejection. The rewrite now targets the backend stable Production domain. This changes routing only; it does not disable SSO or weaken application authentication, authorization, or CSRF checks.
