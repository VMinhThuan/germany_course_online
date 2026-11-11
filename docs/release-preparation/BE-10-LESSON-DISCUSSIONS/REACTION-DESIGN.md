# Reactions

The shared enum is `LIKE`, `LOVE`, `HAHA`, `WOW`, and `CLAP`. A unique `(commentId, userId)` index permits only one current reaction per account and comment. Choosing another reaction changes the row; choosing the current reaction again deletes it.

The comment root lock serializes reaction changes with subtree deletion. A deleted comment cannot be reacted to. Student DTOs expose per-type totals and only the current Student's `isMine` state; Admin DTOs include the current Admin's `myReaction`. No endpoint returns reactor identities.
