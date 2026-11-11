# Accessibility results

The Playwright suite ran axe-core with `wcag2a`, `wcag2aa`, and `wcag21aa` tags. No critical or serious violations were reported in the exercised states:

- Admin inbox, advanced filter dialog, create dialog, and mobile detail.
- Student discussion, reaction picker, and mobile lesson view.

The suite also exercises accessible names for menus, dialogs, controls, and list/detail actions. Interactive menu, popover, and dialog primitives retain their keyboard behavior. The Admin detail shows the full account identity only in its Admin-only route; the student UI continues to use the API's anonymity-aware author display.

The axe pass found muted metadata in the Admin inbox just below the 4.5:1 threshold on pale blue backgrounds. Those specific labels now use the darker secondary text token; the follow-up browser scans passed.

The existing global `prefers-reduced-motion` rule remains in place. UI-11 adds no motion effects. Automated axe checks are not a substitute for a full screen-reader review or manual keyboard-only acceptance by learners and Admins.
