# Deployment Verification

**Implementation commit on `main`:** `6db968ab7906b267c1e6a02bfbefa382841a1828`
**Repository:** `VMinhThuan/germany_course_online`

## Vercel Production deployments

Both projects reported `READY` for the implementation commit:

| Project | Deployment ID | Deployment URL | Target | State |
| --- | --- | --- | --- | --- |
| `germany-course-online-new` | `dpl_9za2fA3UwvEdNytfxnPGpwPpxPXk` | `https://germany-course-online-i6yfftyw4-nguyen-phi-vus-projects.vercel.app` | Production | READY |
| `paniversedeutsch-backend` | `dpl_9cu6BeXmQeRhq8hTguvQGaLPuCiD` | `https://paniversedeutsch-backend-jt8im3jd4-nguyen-phi-vus-projects.vercel.app` | Production | READY |

Production aliases checked:

- Frontend: `https://germany-course-online-new.vercel.app`
- Backend API target: `https://paniversedeutsch-backend.vercel.app`

## Live request evidence

After the frontend deployment became `READY`, anonymous requests through the frontend Production alias returned Express JSON responses with an `x-request-id`:

- Public course listing: `200`, `application/json`, successful envelope. Current catalog result is empty (`total: 0`, `items.length: 0`).
- Anonymous refresh without a session cookie: expected `401` JSON `UNAUTHORIZED`.
- Unknown API path: expected `404` JSON `NOT_FOUND`, not SPA HTML.
- Invalid registration and login bodies: `400` JSON `VALIDATION_ERROR`, before account creation.
- Protected `/auth/me` and admin course route without Bearer token: `401` JSON `UNAUTHORIZED`.

These results distinguish an Express response from the pre-fix Vercel SSO redirect, which was a plain-text `302` to `https://vercel.com/sso-api` without an Express request ID.

## GitHub Actions

The implementation commit triggered [workflow run #9](https://github.com/VMinhThuan/germany_course_online/actions/runs/41798506584). GitHub Actions completed successfully for SHA `6db968ab7906b267c1e6a02bfbefa382841a1828` (`status: completed`, `conclusion: success`, duration 3m 18s).

The documentation follow-up commit may trigger another workflow run; its status is independent from the implementation run and should be checked after the docs push.
