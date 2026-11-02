# Component Inventory (proposed)

Component contracts below are presentation-layer contracts, not backend DTOs. Data must arrive through domain repositories/view models. Props are illustrative and should be typed after DTOs are agreed. Screens refer to IDs in [07-SITEMAP-AND-SCREEN-INVENTORY.md](07-SITEMAP-AND-SCREEN-INVENTORY.md).

## Global shells and navigation

| Component | Purpose / proposed props | Variants / states | Accessibility | Responsive | Screens / dependency |
|---|---|---|---|---|---|
| PublicShell | Wraps public pages; props: children, publicConfig, currentPath | Standard, reduced footer; loading/error config | Skip link, header/nav/main/footer landmarks, focus-visible active link | Desktop nav → mobile semantic drawer | A01–A02/C01–C03; route + PublicSettings repository |
| StudentShell | Student area/navigation; props: userSummary, activeRoute, children | Expanded/collapsed nav; session revoked | Landmark navigation, `aria-current`, drawer focus/escape/return | Sidebar desktop; drawer/bottom nav mobile | E01–I06; Me/Session repository |
| LearningShell | Course context + tree navigation; props: course, tree, currentItem, children | Tree visible/collapsed; preview/read-only | Tree navigation list semantics; announce current item; keyboard navigation | Sidebar desktop; back/drawer mobile | F01–H02; CourseTree repository |
| MobileNavDrawer | Responsive menu; props: open, onOpenChange, items, activeItem | Closed/open/submenu expanded | Trigger is button with label/expanded; Escape, focus trap/return, inert background if modal | Full-height/side panel mobile; hidden desktop | A01/E01/F01; router only |
| Breadcrumbs | Context and back navigation; props: items(label,href) | Compact/truncated | nav aria-label, ordered list, current page non-link | Collapse middle items mobile | C02/F01–I03; route data |

## Reusable controls and feedback

| Component | Purpose / proposed props | Variants / states | Accessibility | Responsive | Screens / dependency |
|---|---|---|---|---|---|
| Button | Actions; props: variant, size, disabled, loading, type, start/end icon | primary/secondary/tertiary/danger; rest/hover/focus/loading/disabled | Native button, accessible name, busy state; never nested interactive element | Full width optional on mobile CTA | All; design tokens |
| TextField | Text/email/password/coupon; props: id,label,value,onChange,type,autoComplete,error,help | default/invalid/disabled/readonly | Explicit label, described-by help/error, correct autocomplete | Width 100%, no tiny controls | B01–B04/D01/I04–I05; form lib adapter |
| Checkbox/RadioGroup | Terms, marketing, quiz options; props: items,value,onChange,name,error | selected/unselected/disabled/invalid | Native semantics, fieldset+legend, labels; distinct consents | Large tap targets | D01/G02; form/quiz domain |
| StatusBadge | Human-readable status; props: label, tone, icon, statusKind | success/info/warning/error/neutral; optional icon | Text label always present; no color-only encoding | Wraps in narrow cards | D02–D03/E02/I01/G03; mapped view status |
| InlineAlert | Persistent message; props: tone,title,description,actions | info/warning/error/success | role=alert for urgent errors, status for routine; heading semantics | Stacks actions mobile | All forms/error screens; error mapper |
| ToastRegion | Short non-blocking feedback; props: items,onDismiss | success/info/error, timed/manual | live region; pause/dismiss; not sole error channel | Bottom corner/near action; avoid keyboard | All; notification service |
| ConfirmDialog | Confirm reversible/important action; props: title,body,confirmLabel,onConfirm | confirm/warning; loading/error | focus management, Escape behavior, focus return | Full-screen sheet mobile | I06/revoke and selected actions only; dialog primitive |
| Skeleton/EmptyState/ErrorState | Async and no-data states; props: kind,title,description,action | loading/empty/network/not-found/forbidden | Loading announced; retry/action semantic; skeleton decorative | Mirrors card/list dimensions | C01,E01,E02,F01,I01–I02; repository result |

## Public, catalog and commerce

| Component | Purpose / proposed props | Variants / states | Accessibility | Responsive | Screens / dependency |
|---|---|---|---|---|---|
| LandingHero | Main value proposition; props: title,description,primaryAction,proof,media | Image/video or text-only; loading/fallback | Heading structure; decorative images alt-empty; CTA label specific | 2-column desktop → stacked mobile | A01; content config |
| CourseCard | Summarize course; props: title,level,shortDescription,price,duration,thumbnail,href | default/owned/preview only when explicitly supplied | Whole card not nested links; image alt; CTA separate | 3 columns desktop → 1 mobile | C01/E02; CourseCardData |
| CourseOutline | Section/lesson hierarchy; props: sections,previewMeta,activeItem | CHAPTER/EXAM_PREP; expanded/collapsed/preview | Disclosure buttons; meaningful heading; lock state text if server says | List rows mobile, tree desktop | C02–C03/F01–F02; CourseTreeData |
| AccessStatePanel | Explain available/preview/expired/unauthorized; props: accessKind,reason,action | available/preview/expired/pending/unavailable | Text + icon, clear action, no invented enum sent to API | Full-width message mobile | C03/F02/F03/G01/E02; explicit API mapping/customer preview config |
| PriceSummary | Display price and access duration; props: amount,currency,duration,discount | purchase/renewal/discount; loading/error | Currency text, semantic list of amounts; not color-only | Stacked mobile | C02/D01/I03; order/plan DTO mapper |
| CouponField | Enter/validate coupon; props: value,onValidate,result,disabled | idle/loading/valid/invalid/network error | Error association, live result, button reachable | Stack field/button mobile | D01; coupon repository |
| OrderSummary | Review order; props: courseSnapshot,base,discount,total,duration | purchase/renewal/pending | Correct totals, server-owned amount, accessible term labels | Sidebar desktop → below form mobile | D01–D03/I02; OrderSummary view model |
| PaymentStatusPanel | Explain order status; props: status,orderCode,amount,action | pending/paid/failed/cancelled/expired | Clear status heading; no access claim for pending | Centered, one-column | D02–D03; Order repository/webhook-updated API |

## Authentication and account

| Component | Purpose / proposed props | Variants / states | Accessibility | Responsive | Screens / dependency |
|---|---|---|---|---|---|
| AuthForm | Shared sign-in/register/reset; props: mode,fields,onSubmit,status | login/register/forgot/reset; idle/submitting/success/error | Fieldset/labels, autocomplete, summary + inline errors | Narrow max-width, full-width mobile | B01–B04; Auth repository/form schema |
| PasswordField | Reveal/hide affordance; props: label,value,onChange,autoComplete,error | hidden/visible/invalid | Toggle is named button; secure autocomplete; does not expose value in logs | Full width | B01/B02/B04/I05; form layer |
| SessionList | Safe sessions; props: sessions,onRevoke | active/revoked/expired; empty/loading | Status and device text; revoke button label includes device | Stacked mobile | I06; SafeSessionDTO mapper |
| ProfileForm | Editable safe profile fields; props: initialValues,onSave,fieldErrors | pristine/dirty/saving/saved/error | Labels, required/optional stated; role/passwordHash excluded | One column mobile | I04; Profile repository |

## Learning, exercise and quiz

| Component | Purpose / proposed props | Variants / states | Accessibility | Responsive | Screens / dependency |
|---|---|---|---|---|---|
| ProgressBar | Show server progress; props: value,label,completed,total | not-started/in-progress/completed; loading | Progressbar role + text value/count; no color-only | Flexible | E01/E02/F01/H01; Progress view model |
| LessonRow | Navigate lesson; props: title,type,progress,estimatedMinutes,access,href | preview/available/unavailable/complete as derived view | Real link when navigable; status text; meaningful focus | Image-left compact mobile | F01/F02; lesson view model |
| MediaPlayer | Video/audio playback; props: source,kind,title,captions,poster | loading/ready/expired/error | Keyboard controls, captions/transcript support, no autoplay audio | Fluid aspect ratio | C03/F03/G01; signed MediaAccessDTO |
| PDFViewer | Present PDF; props: signedUrl,title,downloadAllowed,expiresAt | loading/ready/error/expired | Accessible title and fallback/open/download link when allowed | Full width; controlled height | F03/G01; MediaAccess repository |
| ExercisePanel | Instructions and file exercise lifecycle; props: exercise,questionAssets,progress,onComplete,solutions | FILE_BASED; not-started/in-progress/completed | Completion button status, asset labels, response feedback | Single column mobile | F03/G01; Exercise/Progress repositories |
| QuizRunner | Render single-choice quiz; props: attempt,questions,onSubmit | IN_PROGRESS/submitting/error; no correct-answer variant | Radio groups, question count, focus to validation; no `isCorrect` prop in start question type | One question/card, stack controls | G02; Quiz repository |
| QuizResult | Display server result; props: score,maxScore,correctCount,totalQuestions,review,retryAllowed | submitted/result loading; review based on API | Summary text; answer status textual; retry only from backend-provided capability | Single column mobile | G03; QuizResultDTO mapper |
| LessonNotesEditor | Save one personal lesson note; props: note,onSave,saveStatus | clean/dirty/saving/saved/error | Label, character policy only if backend specifies; save announcement | Full width | F03/H02; LessonNote repository |

## Component dependency notes

- UI components should depend on typed view models, not Prisma/database records.
- Form components can be controlled by React Hook Form + Zod after validation contract is agreed; component API should not depend on server implementation.
- Media, payment and session states must come from repositories/global response handling; no component may unlock access locally.
- Use a maintained accessible headless primitive for dialogs/menus/accordion if it meets the app's runtime and license needs; exact library is not selected.
