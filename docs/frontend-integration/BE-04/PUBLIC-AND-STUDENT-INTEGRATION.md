# Public Website and Student Integration

## Public pages

`frontend/src/app/public-site/api-pages.tsx` and `frontend/src/data/api/public-repository.ts` back the landing page, catalog and course detail with `/site-settings/public`, `/courses`, and `/courses/:slug`. Prices are formatted from API decimal-string values. Course sections and summaries come from published course DTOs. No private lesson material is rendered on public course pages.

The production route graph has no chapter-position A1.1 free-preview exception. The legacy repository methods `getPreviewManifest` and `getPreviewLesson` deliberately return `null`; they do not supply protected lesson content. Public media metadata endpoint remains unused because public page DTOs contain the media metadata required by current UI.

## Student account and dashboard

`frontend/src/app/student/pages.tsx` and `student-lms/account-pages.tsx` consume dashboard, enrollment, profile, password, session, order and course overview operations through `apiStudentRepository`.

- Active, expired-display and revoked states are presented separately. Expiry display is not an authorization decision.
- The dashboard and course progress use server-returned completion/progress values.
- Renewal is an entry point only for eligible enrollment. Backend determines actual eligibility and calculated expiry.
- Guest or non-entitled requests cannot reveal protected learning content; the API response drives the error state.
- Profile/password/session actions use API results and do not update local authorization role.

## Demo isolation

`frontend/src/main.tsx` selects `ProductionApp` for production builds. `App.tsx`, `StudentDemoDevControls`, `/__dev/*`, and legacy demo pages/repositories are development and test support. Production flows use `data/api` implementations. A backend failure is shown to the user; it does not fall through to demo repository data.
