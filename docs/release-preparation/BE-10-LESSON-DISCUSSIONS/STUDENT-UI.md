# Student discussion UI

`LessonDiscussion` is placed after lesson notes and lesson content. It uses the existing API client and TanStack Query, paginates root comments in batches of 20, and loads direct replies on demand.

The composer supports Vietnamese/German Unicode, a 2,000-character count, per-comment anonymous choice and an explanation that Admin can still identify the author. Comment cards show public author labels, role, timestamp, edit state, reaction controls, reply count, inline edit, and delete confirmation. Nested indentation is capped visually while preserving the server's five-level tree. Edited history opens in a keyboard-managed dialog; moderated history is not linked.

Mutations invalidate discussion/reply queries after success. Failed edits keep the user's draft. No comment content is rendered as HTML. The discussion is shown by default; setting `VITE_LESSON_COMMENTS_ENABLED=false` hides it. The backend independently gates Student routes with `LESSON_COMMENTS_ENABLED`.
