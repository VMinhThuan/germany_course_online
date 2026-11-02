# Phase 2A — Free Preview Behavior

## Approved demo manifest

The public demo contains a course-scoped manifest for `tieng-duc-a1-1` with exactly these IDs:

1. `a11-chapter-01` — Hallo! · Chào hỏi
2. `a11-chapter-02` — Ich heiße … · Tên và cách xưng hô
3. `a11-chapter-03` — Woher kommen Sie? · Bạn đến từ đâu?

`getPreviewSections` requires three unique IDs that belong to the same course and resolve to published `CHAPTER` sections. It does not infer a preview from sort order, lesson count, or the first three lessons.

## Navigation

- A URL without `sectionId` uses the first allowed section and its first published lesson, then replaces the URL with those IDs.
- Section changes update `sectionId`; lesson changes update both `sectionId` and `lessonId`.
- Query state drives navigation only. The use case and repository each constrain content to the manifest.
- Unknown slug → public 404. Unknown section → invalid-section state. A known non-preview chapter or exam-prep section → restricted state. An unlisted lesson → lesson-not-found. A listed lesson without sample content → content-missing.
- Paid chapter requests never call `getPreviewLesson`; no paid lesson content or media source is returned.

## Media and learning state

Preview lesson paragraphs/phrases are sample text explicitly marked as demo content. The video record has `availability: 'unavailable'`, the message “Video học thử đang được cập nhật.”, and no source URL. No progress or account data is stored.

The customer requirement requested three free chapters, but the IDs/provider/guest authorization are not present in V3. These identifiers are a client demo manifest, not a production entitlement guarantee. See [Phase 2B handoff](PHASE-2B-HANDOFF.md).
