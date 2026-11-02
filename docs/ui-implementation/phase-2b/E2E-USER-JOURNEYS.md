# E2E user journeys

All journeys are implemented in `frontend/e2e/auth-student.spec.ts`. They use visible UI actions and fictional `.test` personas.

| Flow | Journey                                                     | Verified result                                                            |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| A    | Landing → Login → An Trần demo account                      | Dashboard opens with safe display name.                                    |
| B    | Register `.test` profile → Login with ephemeral credentials | Registration stays signed out; login opens empty dashboard.                |
| C    | Forgot → simulated reset link → reset → Login               | No email is sent; in-memory demo password changes.                         |
| D    | Guest opens `/student/courses` → demo login                 | Return path lands on My Courses.                                           |
| E    | Linh with no enrollment → catalog → A1.1 free preview       | Empty state remains useful; public preview opens.                          |
| F    | An active student → My Courses → course detail              | Supplied 0/7 progress displays; public detail opens.                       |
| G    | Mai expired entitlement → My Courses → course detail        | Expired state and unavailable renewal are shown; no `/learn/` link exists. |
| H    | Logout → protected route attempt                            | Session/cache clear; guest is sent to login again.                         |
| I    | Dev-only session revoke → next protected request            | `SESSION_REVOKED`, student cache clear, notice and login redirect.         |
| J    | Next student read fails → retry                             | Error state appears, then recovers after the one-shot error is consumed.   |

The same spec checks 1440×900, 768×1024, 390×844, and 320×640; no horizontal overflow; mobile student drawer; login keyboard order/validation; screenshots; and axe scans. Previous foundation, LMS kit, and public-site journeys remain in the full E2E run.
