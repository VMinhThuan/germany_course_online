# Course outline interaction

`frontend/src/domains/learning/lesson-outline-accordion.tsx` is reused in the course overview and lesson navigation.

## Behavior

- One lesson is expanded at a time. The current/first incomplete lesson opens initially when the API provides it.
- The lesson button exposes `aria-expanded` and `aria-controls`; Enter and Space toggle it using native button behavior.
- The course page offers a separate “open lesson” action and the existing chapter route.
- Video links navigate to `/learn/lessons/:lessonId`; exercise links navigate to `/learn/exercises/:exerciseId`.
- The lesson sidebar renders children only for the active lesson.
- Empty lesson children do not create placeholder exercise links. The no-content message appears only when both published video and exercise metadata are absent.
- Expanding/collapsing or navigating does not update progress.
- The video-only screenshot uses a test-only transform on the isolated API response to exercise the empty-exercise state; the application itself still renders only the metadata returned by the backend.

Children are derived from the authenticated course overview API response. The client does not synthesize exercise counts, titles, IDs, or video availability.
