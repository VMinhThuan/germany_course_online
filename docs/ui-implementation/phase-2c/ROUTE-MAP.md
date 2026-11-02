# Phase 2C — Route map

| ID  | Route                                          | Screen / behavior                                                                                                       |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| F01 | `/learn/courses/:courseId`                     | Course overview, tree, entitlement and progress.                                                                        |
| F02 | `/learn/courses/:courseId/sections/:sectionId` | Chapter lessons and access state.                                                                                       |
| F03 | `/learn/lessons/:lessonId`                     | Lesson content, media fallbacks, required exercises, completion and previous/next navigation.                           |
| G01 | `/learn/exercises/:exerciseId`                 | File exercise, completion and exercise-scoped solution; same path also opens the quiz introduction for a quiz exercise. |
| G02 | `/learn/quizzes/:attemptId`                    | One active attempt, answer selection and submit confirmation.                                                           |
| G03 | `/learn/quizzes/:attemptId/result`             | Submitted score, per-answer review and retry.                                                                           |
| H01 | `/student/progress`                            | Repository-derived course and per-lesson progress.                                                                      |
| H02 | `/learn/lessons/:lessonId#notes`               | Notes anchor within F03; not a separate page.                                                                           |

All routes are protected by `ProtectedStudentRoute`; access to paid learning content is evaluated again by the learning repository. Unknown course, section, lesson, exercise, or attempt values stay in recoverable error states. SPA deep links and reloads are covered by Playwright.
