# Phase 2C — Business rules and mock boundaries

- Enrollment keeps the V3 enum `ACTIVE | REVOKED`. Expiry is a derived display/access state; it is not a new enrollment enum.
- A protected route is not authorization. Lesson content, exercises, quiz operations, and solution assets are returned only when the repository grants the corresponding capability.
- A required file exercise and required quiz must both be completed before the first lesson in the mock course becomes complete. Optional exercise completion does not gate the lesson.
- Quiz type is `SINGLE_CHOICE`. Attempts expose no correct-option metadata; score and answer explanations appear only after submit. Retry creates a new attempt.
- A file exercise can reveal only its own answer asset after its completion capability succeeds.
- Progress counts only lessons marked to count toward progress and is sourced from one repository calculation.
- Media URLs are not invented. Missing video/audio are presented as unavailable; only included demo worksheet assets are linked.

This is a frontend demonstration. It is not an authorization boundary for production media delivery.
