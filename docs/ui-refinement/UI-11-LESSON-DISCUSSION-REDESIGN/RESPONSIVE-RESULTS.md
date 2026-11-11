# Responsive results

All screenshots were captured in Chromium with the listed viewport size. Playwright checked document, body, and app-root widths against the viewport. The suite passed without horizontal overflow at the checked sizes.

| Viewport   | Student                                                                            | Admin                                                                                              |
| ---------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1440 × 900 | Lesson navigation precedes discussion; roots and expanded replies remain readable. | Inbox list and selected detail are side by side; filters span the content area.                    |
| 768 × 1024 | Discussion remains in the lesson flow with usable controls.                        | Single-pane list/detail flow, with two-column catalog filters; no horizontal overflow.             |
| 390 × 844  | Lesson, composer, reply connector, and comment actions fit the mobile viewport.    | List and detail are separate views. Detail hides summary and filters and provides a return button. |

## Screenshots

- Student: [1440 × 900](screenshots/student-discussion-1440x900.png), [768 × 1024](screenshots/student-discussion-768x1024.png), [390 × 844](screenshots/student-discussion-390x844.png)
- Admin: [1440 × 900](screenshots/admin-inbox-selected-1440x900.png), [768 × 1024 list](screenshots/admin-inbox-selected-768x1024.png), [768 × 1024 detail](screenshots/admin-mobile-detail-768x1024.png), [390 × 844 list](screenshots/admin-mobile-list-390x844.png), [390 × 844 detail](screenshots/admin-mobile-detail-390x844.png)

These are browser viewport checks, not physical-device testing. The global Admin/student navigation remains visible as in the existing application.
