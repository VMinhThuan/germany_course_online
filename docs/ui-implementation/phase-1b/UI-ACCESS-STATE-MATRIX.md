# UI Access and State Matrix

| Presentation condition | Component behavior | Data source / boundary |
|---|---|---|
| Available | `AccessStatePanel` success/info; lesson/course navigation enabled where links/capabilities are supplied. | `CourseAccessViewModel` returned by repository. Real entitlement remains backend-authoritative. |
| Customer-requested preview | Preview badge/section only for manifest IDs that are `CHAPTER`. | `MOCK_PREVIEW_MANIFEST`; development fixture only. |
| Restricted | Explain reason and show locked panel; restricted lesson rows can be disabled or rendered without links. | Explicit presentation state, not authorization logic. |
| Expired display | Show expiry information while retaining enrollment enum ACTIVE/REVOKED. | Repository compares `expiresAt` with injected clock; no new enum. |
| Loading | Accessible status/loading states for list/media/repository states. | Component loading props or view model availability. |
| Empty | Directional empty content for catalog, tree, sessions, notes/progress. | Empty list/null repository response. |
| Error/network | Actionable error state; no guessed backend-specific code. | Network error or known envelope/status mapping. |
| Exercise incomplete/solution denied | Solution assets remain hidden; no local access grant. | `ExerciseViewModel.capabilities.canViewSolutions`. |
| Exercise completion accepted | Component calls callback; repository returns completion and explicit solution capability. | Mock repository response. |
| Quiz IN_PROGRESS | Options are controlled; no correct-answer fields in start model. | `QuizAttemptViewModel` only. |
| Quiz SUBMITTED | Score/review/retry shown only as supplied by separate result/capabilities. | `QuizResultViewModel`; no local grading or pass threshold. |
| Payment PENDING | Pending panel says access has not been granted; no course action. | Exact order/payment statuses; no enrollment fixture. |
| Payment PAID/SUCCESS | Success panel; course action appears only when explicit `canOpenCourse` and callback are supplied from repository/enrollment view. | Mock scenario controller selects confirmed fixture. |
| Coupon validation | Pending/error/success/invalid feedback; no total calculation. | Repository returns typed validation result and VND amount string. |
| Notes | Dirty/saving/saved/error plus retry control. | Controlled value and save callback; in-memory mock persistence only. |

The visual words “preview”, “restricted”, “expired”, and “available” are UI classifications. They do not add values to V3 enums and do not replace backend access checks.

