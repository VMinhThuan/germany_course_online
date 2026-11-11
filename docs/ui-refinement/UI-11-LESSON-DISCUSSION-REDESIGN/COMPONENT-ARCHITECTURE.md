# Component and data architecture

## Frontend ownership

| File                                                         | Responsibility                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `frontend/src/domains/learning/lesson-discussion.tsx`        | Student composer, root list, reply thread, contextual actions, history and confirmation flows                  |
| `frontend/src/domains/learning/comment-reaction-control.tsx` | Shared, accessible reaction summary and picker used in student and Admin views                                 |
| `frontend/src/app/admin/lesson-comments-page.tsx`            | Admin search/filter state, summary, paginated inbox, selected detail, catalog-based creation                   |
| `frontend/src/app/admin/shared.tsx`                          | Existing Admin layout and controls; adds an optional page-heading visibility switch                            |
| `frontend/src/app/admin/pages.tsx`                           | Turns off the outer decorative heading for the lesson-comments route only                                      |
| `frontend/src/app/student-lms/learning-pages.tsx`            | Places lesson navigation before the discussion                                                                 |
| `frontend/src/shared/ui/primitives.tsx`                      | Adds an optional custom trigger to DropdownMenu and sizing class to Popover while preserving existing defaults |

## Data flow

The pages continue to call `lessonCommentsRepository` and `adminRepository`. Query keys remain scoped to the affected list or parent reply container to avoid unnecessary invalidation of unrelated reply queries. Catalog options and author lookup use existing paginated Admin APIs. No endpoint or wire format was added or changed.

The UI relies on server-supplied capability flags and existing roles for action visibility. It does not duplicate authorization decisions in place of the API.

## Tests

- Vitest component tests cover student actions, Admin catalog creation and filtering, and lesson navigation order.
- The UI-11 Playwright suite intercepts API calls with synthetic response fixtures and checks browser behavior, responsive layout, and selected axe rules. See [TEST-RESULTS.md](TEST-RESULTS.md).
