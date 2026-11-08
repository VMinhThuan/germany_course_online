# Responsive results

Playwright exercised both learning pages in Chromium at these CSS viewports:

| Viewport                  | Course heading                            | Lesson heading                            | Horizontal overflow |
| ------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------- |
| Desktop 1440 × 900        | Visible, full viewBox and generated paths | Visible with Back link and lesson content | None                |
| Tablet 768 × 1024         | Visible                                   | Visible with Back link and lesson content | None                |
| Mobile 390 × 844          | Visible                                   | Visible with Back link and lesson content | None                |
| 200%-equivalent 720 × 450 | Visible                                   | Visible with Back link and lesson content | None                |

At mobile width, the heading uses the full content row, with the Back link below it and aligned to the right. This keeps the 19-character Vietnamese heading legible without covering the control.

The final row uses a 720 CSS-pixel layout viewport to represent the effective width of 200% zoom on a 1440 CSS-pixel desktop. It verifies responsive wrapping and overflow at that effective width; it is not a browser-native zoom or device-scale-factor test. All screenshot dimensions are reflected in their filenames.
