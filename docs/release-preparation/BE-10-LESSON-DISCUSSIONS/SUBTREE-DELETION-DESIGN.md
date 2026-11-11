# Subtree deletion

Deletion is a transactional cascade soft-delete. The selected comment and every descendant found through `ancestorIds` receive `deletedAt`, `deletedBy`, and the optional reason in a single replica-set transaction. An Admin deletion also writes `LESSON_COMMENT_DELETED` in that transaction.

All mutations within a discussion acquire a write on the root comment. Reply creation, edit, reaction and deletion therefore conflict and retry in a safe order. A reply cannot commit after its parent has been deleted. If the deletion transaction cannot complete, neither the root tombstone nor a partial cascade commits.

Student list/reply endpoints select only active comments, and mutations verify the selected comment and ancestors. The confirmation text explains that all descendants will be hidden. Soft-deleted content and history remain available to Admin for audit.
