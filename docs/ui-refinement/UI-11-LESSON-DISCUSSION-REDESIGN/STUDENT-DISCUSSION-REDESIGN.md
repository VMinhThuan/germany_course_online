# Student lesson discussion

The discussion remains part of the lesson page, after lesson content, notes, and the previous/complete/next navigation controls. This keeps lesson progression actions above the comments.

## Reading and composing

- The composer is compact, shows its character count while active, and explains the student-visible effect of posting anonymously.
- The count label says “bình luận gốc” because it counts top-level comments, not replies.
- Root comments and replies share a compact list. A fine vertical connector links replies to their parent without wrapping each reply in a separate card.
- Anonymous participants get an anonymous label/icon. Admin identity is identified with an Admin badge. The student API's author display remains the source of truth for privacy.
- Newest/oldest sorting is available for the root list.

## Actions

- Reply opens an inline composer on the selected comment and retains its parent relationship.
- The reaction control shows existing counts and the current user's choice; its popover offers the existing reaction types.
- Edit and delete are in the comment's contextual menu. The API's `canEdit` / `canDelete` flags control availability.
- Edit history uses the existing history endpoint. Delete asks for confirmation and uses the existing delete operation, including its subtree behavior.

The UI does not implement separate persistence rules. Create, reply, reaction, edit, history, and delete continue through `lessonCommentsRepository`.

## Browser evidence

- [Desktop discussion and thread](screenshots/student-thread-expanded-1440x900.png)
- [Reaction picker](screenshots/student-reaction-picker-1440x900.png)
- [Inline reply](screenshots/student-inline-reply-1440x900.png)
- [Mobile lesson and discussion](screenshots/student-discussion-390x844.png)
