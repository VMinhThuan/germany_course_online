# Anonymity and privacy

Anonymity is enforced by response construction on the server, not by hiding fields in React.

- `StudentCommentDto` and `AdminCommentDto` are separate contracts.
- An anonymous Student is presented to Students as “Học viên ẩn danh” with a null avatar. The Student DTO contains no author ID, email, phone, full name, or asset identifier.
- Public Student comments expose only display name and role label. Admin identity is shown as “Quản trị viên” to Students.
- Reactions return counts and the current caller's selected reaction, never a list of reacting users.
- Student edit-history DTOs omit editor identifiers. If an Admin moderates a comment, Student history is suppressed completely so removed content cannot be recovered through revisions.
- Admin endpoints return the real author ID, full name, email, role, status and anonymous flag.
- The API validates and ignores no client-supplied identity: strict request schemas reject extra fields such as `authorId` and `userId`.

The integration suite checks anonymous responses, Admin identity access, Student/Admin role boundaries, entitlement and moderation-history redaction.
