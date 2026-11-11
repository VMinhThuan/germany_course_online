# Admin comment inbox

## Inbox layout

- A plain page heading, short purpose statement, create action, and compact summary metrics replace the decorative heading and wide table presentation on this route.
- The desktop inbox uses a paginated list beside a selected comment detail pane. The selected item is identifiable and keyboard-operable.
- Search, catalog context, status, sort, and advanced filters are available without forcing the detail view into an eight-column table.
- The list avoids exposing author email. The Admin-only detail pane shows the real author identity, role, anonymity status as seen by learners, lesson context, reactions, and the discussion branch.
- Moderation keeps the existing edit, history, reply, reaction, and subtree-delete actions and reason fields.

## Filtering and creation

- Course, section, and lesson selection follow the existing catalog APIs. Section narrows the lesson choices; a chosen lesson is the effective catalog filter.
- Advanced filters include author lookup by name/email, anonymous/public status, root/reply type, and date range.
- The create dialog uses dependent searchable Course → Section → Lesson selectors. It never asks an Admin to type an ObjectId.
- Create/edit/reply flows use existing repositories and payloads.

## Responsive behavior

- At 1440px, list and detail sit side by side.
- At 768px, the inbox uses the single-pane list/detail flow and the main catalog filters use a two-column layout.
- At 390px, the inbox switches between list and detail. Opening detail hides summary and filter controls; “Trở lại hộp thư” returns to the list.

Evidence: [desktop inbox](screenshots/admin-inbox-selected-1440x900.png), [tablet inbox](screenshots/admin-inbox-selected-768x1024.png), [advanced filters](screenshots/admin-advanced-filters-1440x900.png), [create dialog](screenshots/admin-create-comment-dialog-1440x900.png), [mobile list](screenshots/admin-mobile-list-390x844.png), and [mobile detail](screenshots/admin-mobile-detail-390x844.png).
