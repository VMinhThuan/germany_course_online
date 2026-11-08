# Sidebar refinement

`LessonOutlineAccordion` has a compact mode for the sticky lesson sidebar.

- Lesson titles use a 15 px base size, wrap to at most two lines, and keep the full title in the native `title` attribute.
- The lesson number, completion/current status, and active border remain in separate grid columns so a long title does not push status out of view.
- The current lesson receives a pale-blue surface and teal leading rule. Completed/current/not-started states retain readable text and icon cues.
- Only the current lesson exposes its actual video/exercise children in compact mode; other lessons show their names and status only.
- On smaller screens the sidebar becomes a right-side sheet opened by the “Nội dung khóa học” control.
- Secondary index/status colors were darkened locally after axe found values narrowly below 4.5:1 on the pastel surfaces.

The long-title review image changes the active title in the browser DOM for the screenshot stress case only. It does not modify API data or application source.
