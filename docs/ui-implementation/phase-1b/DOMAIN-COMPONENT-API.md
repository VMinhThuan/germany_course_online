# Domain Component API

Canonical props are the exported function signatures in the domain component files listed in [DOMAIN-COMPONENT-INVENTORY.md](DOMAIN-COMPONENT-INVENTORY.md). The table below is a compact API index. Model definitions live in each domain's `models.ts`; callbacks are supplied by the route/use-case layer.

| Component family | Main input props | Main callbacks / controlled state |
|---|---|---|
| Landing and catalog | text content, `CourseSummaryModel`, `CourseDetailModel`, section arrays, optional `CourseAccessViewModel`, optional `MockPreviewManifest` | landing/detail CTA callbacks; `CourseGrid.onOpenCourse(course)`; outline lesson selection |
| Learning navigation/content | `CourseTreeViewModel`, section/lesson models, `CourseAccessViewModel`, `LessonContentViewModel`, backend-view `CourseProgressViewModel` | select lesson IDs; navigation callbacks; optional back/explore callbacks |
| Media | `MediaViewModel` (safe URL, availability, captions/transcript, download capability) | optional retry callback; PDF embedded-support presentation switch |
| Exercises | `ExerciseViewModel` with exercise-scoped assets/capabilities | `onComplete(): void | Promise<void>`; repository-owned status/capability update |
| Quiz | `QuizAttemptViewModel`, `QuizQuestionViewModel`, `QuizResultViewModel` | controlled question index/answer selection; `onSubmit(): Promise<QuizResultViewModel>`; retry callback only when allowed |
| Progress and notes | `CourseProgressViewModel`, `LessonProgressItemViewModel`, display labels | controlled note `value`/`onChange`; async `onSave(value)` |
| Commerce and enrollment | integer-string VND amounts; `OrderSummaryViewModel`, `RenewalPlanViewModel`, `EnrollmentSummaryViewModel` | coupon async validation; plan selection; optional navigation callbacks; payment state receives explicit `canOpenCourse` capability |
| Account | safe `StudentProfileViewModel`, `SessionSummaryViewModel`, navigation items | profile save; optional session revoke callback gated by `canRevoke` |

## Specific prop notes

- `CourseGrid`: `courses`, optional `loading`, `error`, `emptyMessage`, and `onOpenCourse`.
- `CourseSectionAccordion`: one `CourseSectionModel`, optional `preview`, optional lesson action.
- `CourseOutline`: section list, optional mock preview manifest, optional lesson action.
- `FreePreviewSection`: one section and the mock manifest; renders only if the section ID is in the manifest and its type is `CHAPTER`.
- `CourseTree`: tree, optional exact `previewSectionIds`, optional lesson selection callback.
- `LessonRow`: lesson, current marker, optional `href` or callback, optional restricted presentation; the component renders a single link or button.
- `VideoPlayer`/`AudioPlayer`/`PDFViewer`: media view model. Native media controls are used; download is presented only if `canDownload` is true.
- `ExerciseSolutionPanel`: one exercise view model. Answer/solution assets are hidden unless `capabilities.canViewSolutions` is true.
- `QuizRunner`: attempt, current question index, navigation/answer callbacks, async submit returning a separately supplied result, optional retry callback.
- `LessonNotesEditor`: initial/current value, change callback, async save callback. It reports dirty/saving/saved/error states and offers retry after rejection.
- `CouponField`: async `onValidate(code)` returning a typed validation view model; each instance creates its own field ID.
- `PaymentStatusPanel`: order, optional explicit `canOpenCourse`, optional open callback. PENDING always renders the pending state.
- `SessionList`: safe session summaries, explicit `canRevoke`, optional revoke callback.

Props deliberately do not expose database entities, `storageKey`, password/token hashes, raw IP/user agent, quiz answer keys at attempt start, or payment-provider secrets.

