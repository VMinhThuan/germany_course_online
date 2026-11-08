# Responsive results

The isolated Playwright E2E captured the course overview and lesson workspace at the three requested viewports. Each route checks `documentElement.scrollWidth - innerWidth <= 1` for horizontal overflow.

| Viewport   | Course overview                                                | Lesson workspace                                                                 |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1440 × 900 | [Screenshot](screenshots/course-overview-desktop-1440x900.png) | [Screenshot](screenshots/lesson-workspace-desktop-sidebar-expanded-1440x900.png) |
| 768 × 1024 | [Screenshot](screenshots/course-overview-tablet-768x1024.png)  | [Screenshot](screenshots/lesson-workspace-tablet-768x1024.png)                   |
| 390 × 844  | [Screenshot](screenshots/course-overview-mobile-390x844.png)   | [Screenshot](screenshots/lesson-workspace-mobile-390x844.png)                    |

The desktop lesson outline stays sticky. Below the existing large-screen breakpoint, it is opened in a right-side sheet; see [mobile sheet](screenshots/lesson-outline-mobile-open-390x844.png). The lesson content and pink exercise section stack vertically on mobile. No responsive shell or global navigation architecture was replaced.
