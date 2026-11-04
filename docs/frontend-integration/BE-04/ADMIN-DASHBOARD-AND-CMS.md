# Admin Dashboard and CMS

## Navigation and role boundary

Admin routes are protected by `ProtectedAdminRoute` in `frontend/src/app/auth/routes.tsx`; backend Admin RBAC remains authoritative. Admin UI is lazy-loaded to keep its code out of the initial route chunk. `AdminLayout` in `frontend/src/app/admin/shared.tsx` provides the consistent navigation, loading/error feedback and logout action.

## Dashboard and CMS capabilities

- `/admin`: API-derived course/student/enrollment/PENDING-order counts and recent order summaries.
- `/admin/courses`: course list, create/edit, publish and soft-delete flows.
- Nested course sections, lessons and exercises: create/edit/reorder by sort order and soft-delete through Admin APIs.
- Exercise editor: load/replace Quiz configuration via backend quiz DTO.
- `/admin/media`: list assets, upload intent/provider transfer/complete, delete, and associate/unassociate assets to Lessons/Exercises with role and sort order.
- `/admin/settings`: edit site presentation/contact/payment settings.
- `/admin/audit-logs`: view server audit records.

## Data and safety

Admin mutations pass through `frontend/src/data/api/admin-repository.ts` and invalidate affected TanStack Query keys. Destructive/access-affecting operations ask for confirmation or a reason. API validation and permission errors are displayed as errors; the dashboard does not present local fake success counts.

Admin route navigation and dashboard were exercised in browser E2E and axe scanned at `/admin`. Full browser CRUD for course/section/lesson/exercise/quiz, site settings, and audit filtering remains a follow-up verification item; adapters and screens are implemented, but the 3 business E2E scenarios do not execute every CMS mutation.
