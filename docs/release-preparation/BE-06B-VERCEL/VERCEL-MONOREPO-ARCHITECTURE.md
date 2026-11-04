# Vercel Monorepo Architecture

## Intended projects

| Project | Git repository | Root Directory | Build/output |
|---|---|---|---|
| Frontend | `VMinhThuan/germany_course_online` | `frontend` | Vite, `npm run build`, `dist` |
| Backend | `VMinhThuan/germany_course_online` | `backend` | Express on Node.js Functions |

Both projects should use `main` as the production branch. Vercel Git Integration owns deploys; GitHub Actions owns checks. No second Vercel deploy workflow is added.

## Current evidence

- Hobby team `nguyen-phi-vus-projects` is authorized for this task.
- Existing project `germany-course-online-new` (`prj_sKP7gGHQhVmeKX9xzfDB9fKUJdtQ`) is linked to this GitHub repository, uses the Vite framework, tracks `main`, and has a READY Production deployment for SHA `019fee34a2bb0c948b6ed9f116de74f02a50a7d5`.
- Its aliases are `germany-course-online-new.vercel.app`, `germany-course-online-new-nguyen-phi-vus-projects.vercel.app`, and `germany-course-online-new-git-main-nguyen-phi-vus-projects.vercel.app`. SSO protection is enabled for all non-custom domains. Keep it unchanged.
- Build events show Vite publishing `dist/index.html` and assets. The Vercel connector response does not include the explicit Root Directory/build fields; the Windows UI inspection helper could not initialize, so `frontend` is the expected root but is not independently confirmed from the settings page.
- The team project inventory shows no backend project for this repository yet. Create a separate backend project with Root Directory `backend` after that source is pushed. Do not upgrade the Hobby plan.
