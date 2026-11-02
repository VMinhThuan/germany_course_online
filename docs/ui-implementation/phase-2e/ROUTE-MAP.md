# Phase 2E — Route map

| ID  | Route                        | Screen / behavior                                                            |
| --- | ---------------------------- | ---------------------------------------------------------------------------- |
| I04 | `/student/profile`           | Read safe profile fields and update display name.                            |
| I05 | `/student/security/password` | Validate current/new demo password; end and revoke current session.          |
| I06 | `/student/security/sessions` | Show safe single-session summary and end current session after confirmation. |
| A02 | `/help`                      | Public help and FAQ built on the existing public shell and accordion.        |

I04–I06 use `ProtectedStudentRoute`. Session revocation clears protected student query cache; the login page explains revoked session state. A02 is public and available to guests and students.
