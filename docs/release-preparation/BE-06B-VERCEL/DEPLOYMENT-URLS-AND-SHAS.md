# Deployment URLs and SHAs

Production deployment records and GET smoke results below were checked after Git Integration completed. The API remains unconfigured and protected by Vercel SSO.

| Target | Project | URL | Commit SHA | Status |
|---|---|---|---|---|
| Frontend baseline Production | `germany-course-online-new` | `germany-course-online-new.vercel.app` | `019fee34a2bb0c948b6ed9f116de74f02a50a7d5` | READY; predates BE-06B |
| Frontend BE-06B Production | `germany-course-online-new` | [deployment](https://germany-course-online-er163rv8a-nguyen-phi-vus-projects.vercel.app/) | `3063a1ee889fb97bf10449925c9faeb1f3685a7e` | READY; deployment `dpl_7YNB57foyzrEDMoMpwuqM8AuWjPz`; root and `/courses` GET 200; SSO enabled |
| Backend BE-06B Production | `paniversedeutsch-backend` | [deployment](https://paniversedeutsch-backend-8qxvtcuvg-nguyen-phi-vus-projects.vercel.app/) | `3063a1ee889fb97bf10449925c9faeb1f3685a7e` | READY; deployment `dpl_AdRW7A4okNbVxBggNgZSxyzPV1j3`; `/health` 200; backend env empty; SSO enabled |
| GitHub Actions | `Quality Gates` [run #7](https://github.com/VMinhThuan/germany_course_online/actions/runs/41788527881) | `main` | `3063a1ee889fb97bf10449925c9faeb1f3685a7e` | Completed successfully |

The backend `/ready`, `/api/openapi.yaml`, and `/api/v1/courses` return `503 CONFIGURATION_UNAVAILABLE` until approved environment settings are configured. Frontend `/api/v1/courses` smoke was blocked by authentication at the protected backend rewrite. These deployments are not an operational-pass claim.
