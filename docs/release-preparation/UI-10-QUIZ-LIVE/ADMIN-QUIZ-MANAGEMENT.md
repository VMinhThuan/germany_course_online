# Admin quiz management

The existing path remains Course → Section → Lesson → Exercise → Quiz Editor. The editor supports question/option changes, one correct option per question, points, explanations, reordering, preview, validation, and the existing Exercise publish status.

Reordering keeps persisted question and option IDs attached to their data. Saving a Quiz with previous attempts shows a warning; backend attempts continue to use their existing immutable snapshots. Publishing still uses the Exercise `DRAFT` / `PUBLISHED` / `HIDDEN` workflow and backend validation.

The Excel control accepts `.xlsx` up to 5 MiB. It reports valid/invalid rows, row and column errors, and lets an admin append valid rows to the local draft. Selecting a file does not save, publish, or overwrite the current Quiz. The admin must inspect and save the draft through the existing API.
