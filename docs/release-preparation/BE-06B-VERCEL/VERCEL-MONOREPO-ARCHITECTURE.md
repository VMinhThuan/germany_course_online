# Vercel Monorepo Architecture

## Intended projects

| Project | Git repository | Root Directory | Build/output |
|---|---|---|---|
| Frontend | `VMinhThuan/germany_course_online` | `frontend` | Vite, `npm run build`, `dist` |
| Backend | `VMinhThuan/germany_course_online` | `backend` | Express on Node.js Functions |

Both projects should use `main` as the production branch. Vercel Git Integration owns deploys; GitHub Actions owns checks. No second Vercel deploy workflow is added.

## Current evidence

- Hobby team `nguyen-phi-vus-projects` is authorized for this task.
- Frontend project `germany-course-online-new` (`prj_sKP7gGHQhVmeKX9xzfDB9fKUJdtQ`) is linked to this GitHub repository, uses the Vite framework, tracks `main`, and has READY Production deployment `dpl_7YNB57foyzrEDMoMpwuqM8AuWjPz` for SHA `3063a1ee889fb97bf10449925c9faeb1f3685a7e`.
- Its aliases are `germany-course-online-new.vercel.app`, `germany-course-online-new-nguyen-phi-vus-projects.vercel.app`, and `germany-course-online-new-git-main-nguyen-phi-vus-projects.vercel.app`. SSO protection is enabled for all non-custom domains. Keep it unchanged.
- Build events show Vite publishing `dist/index.html` and assets; production GETs to `/` and `/courses` both returned 200. The Vercel connector response does not include the explicit Root Directory/build fields, so `frontend` is inferred from the project setup and deployment result rather than independently confirmed from Settings.
- Backend project `paniversedeutsch-backend` (`prj_XEPZz5KehWJuXENHYhOxShOaVCMv`) uses Express and Node 22.x. Production deployment `dpl_AdRW7A4okNbVxBggNgZSxyzPV1j3` is READY on the same SHA; `/health` returned 200. Both projects keep SSO enabled, both environment inventories are empty, and no paid plan upgrade was made.
