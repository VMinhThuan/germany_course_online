# Design System Specification (proposed)

**Status:** Khuyến nghị để thảo luận trước implementation. Không phải requirement backend hoặc token đã được duyệt. Hướng: light, tươi, gọn; pastel là surface, teal là CTA; không dùng xanh đậm làm màu chủ đạo.

## Brand palette và semantic colors

Contrast ratios dưới đây là tính toán theo WCAG relative luminance cho cặp màu nêu; kiểm tra lại trên final rendered states và font weight/size. AA tối thiểu thường là 4.5:1 text thường, 3:1 text lớn/UI boundary.

| Token đề xuất | Hex | Vai trò | Contrast đã kiểm tra |
|---|---|---|---|
| brand-pastel-blue | #C2E8F5 | Section/card background | Với trắng 1.30:1 (không dùng chữ trên nền trắng bằng màu này) |
| brand-soft-lime | #D1F685 | Highlight/badge surface | Với trắng 1.22:1 (không dùng chữ trên nền trắng bằng màu này) |
| ink-primary | #203039 | Body/headings | Trên trắng 13.61:1 |
| ink-secondary | #4A5B63 | Secondary text | Trên trắng 7.08:1 |
| action-primary | #006B70 | CTA/link/control | Trên trắng 6.29:1; trên #F6FBFC 6.03:1; trắng trên màu này 6.29:1 |
| action-primary-dark | #0B5960 | Hover/pressed | Trên trắng 8.04:1 |
| success-foreground | #176B3A | Success text/icon | Trên #EAF6EE 5.91:1; trên trắng 5.13:1 với #2E7D32 |
| success-surface | #EAF6EE | Success background | Pair with #176B3A |
| warning-foreground | #7A5A00 | Warning text/icon | Trên #FFF4CC 5.79:1 |
| warning-surface | #FFF4CC | Warning background | Pair with #7A5A00 |
| danger-foreground | #B42318 | Error/destructive | Trên #FEF3F2 6.05:1; trên trắng 6.57:1 |
| danger-surface | #FEF3F2 | Error background | Pair with #B42318 |
| info-foreground | #1F5E85 | Informational text | Trên #EAF4FF 6.30:1 |
| info-surface | #EAF4FF | Informational background | Pair with #1F5E85 |
| pastel-blue-ink | #173E4C | Text/icon on blue | Trên #C2E8F5 8.83:1 |
| pastel-lime-ink | #31410B | Text/icon on lime | Trên #D1F685 9.11:1 |
| surface-page | #F6FBFC | Main canvas | With action-primary 6.03:1 |
| surface-card | #FFFFFF | Card/form/control | Ink-primary 13.61:1 |
| border-subtle | #D6E2E6 | Card/input boundary | Non-text contrast should be evaluated against adjacent surface; not body text |

**Semantic rules:** Do not place white text on pale blue/lime; use ink pair tokens. Status must pair color with icon/label. Disabled is still readable and not the only indicator. Links are underlined or otherwise distinct in body copy. Destructive styles require confirmation only when action is irreversible.

## Typography scale

Recommend a neutral sans-serif with Vietnamese diacritics and German umlauts (e.g., system UI stack first; final font is product decision). Keep body text comfortable and hierarchy compact.

| Token | Suggested size / line height | Use |
|---|---|---|
| display | 48/56 desktop; 36/44 mobile | Landing/course hero, one primary message |
| h1 | 36/44 desktop; 30/38 mobile | Screen title |
| h2 | 28/36 | Major sections |
| h3 | 22/30 | Cards/lesson headings |
| h4 | 18/26 | Subsection/form groups |
| body-lg | 18/28 | Intro/lead |
| body | 16/24 | Main reading, instructions |
| body-sm | 14/20 | Supporting UI, metadata |
| caption | 12/18 | Only low-risk metadata; avoid critical instructions |

Use max line length around 65–75 characters in long lesson copy. Avoid all-caps for lengthy labels. Font weights: 400 body, 500 control/labels, 600 headings, 700 only short emphasis.

## Spacing, sizing and elevation

| Token | Value | Usage |
|---|---:|---|
| space-1 | 4 px | Icon/text micro gap |
| space-2 | 8 px | Tight control spacing |
| space-3 | 12 px | Compact card internals |
| space-4 | 16 px | Form fields/card baseline |
| space-6 | 24 px | Section/card padding |
| space-8 | 32 px | Group separation |
| space-12 | 48 px | Section spacing on mobile |
| space-16 | 64 px | Section spacing desktop |
| radius-sm | 6 px | Inputs/small badges |
| radius-md | 12 px | Cards/buttons |
| radius-lg | 20 px | Hero panels/media |
| shadow-1 | 0 1px 3px rgb(32 48 57 / 8%) | Cards at rest |
| shadow-2 | 0 8px 24px rgb(32 48 57 / 10%) | Menus/dialogs/raised CTA |

Content max width: ~1200 px desktop; article/lesson reading column ~720 px. Use grid gap 24 px desktop, 16 px tablet, 12–16 px mobile. These are proposed values to validate against prototypes.

## Responsive breakpoints

Recommended CSS breakpoints: mobile 0–639 px; tablet 640–1023 px; desktop 1024–1439 px; wide 1440 px+. They are proposal, not inferred as exact reference CSS. Validate against surveyed 390×844, 768×1024 and 1440×900.

- Mobile: one-column commerce/cards; lesson row with thumbnail and compact metadata; sticky bottom CTA only if it does not obscure media or keyboard.
- Tablet: reduce course grid to two columns where content permits; stack checkout summary below form.
- Desktop: course catalog grid up to three columns; learning shell with tree sidebar + reading area.
- No horizontal overflow; retain complete title, status and action.

## Layout shells

| Shell | Structure | Screens |
|---|---|---|
| PublicShell | Header, main landmark, compact footer, skip link; sticky header optional | A01–A02, C01–C03 |
| AuthShell | Centered narrow form, brand link, error/status region | B01–B04 |
| CheckoutShell | Back link, main form + order summary; mobile stacked | D01–D03 |
| StudentShell | Responsive header/navigation, breadcrumb, main content, account menu | E01–I06 |
| LearningShell | Course tree/navigation + lesson reading area; mobile drawer/back navigation | F01–G03, H02 |

Navigation must use semantic landmarks, active route indication, visible focus and keyboard-accessible drawers/menus. Do not use clickable divs as navigation controls.

## Interaction and component contracts

| Pattern | Variants / states | Requirements |
|---|---|---|
| Buttons | Primary, secondary, tertiary/link, destructive; default/hover/focus/pressed/disabled/loading | Button element; explicit type; loading announces busy; preserve stable width. |
| Links | Default/visited/external | Anchor for navigation; visible underline or clear affordance; focus visible. |
| Inputs | Text, email, password, currency display, search | Persistent label, described-by help/error, autocomplete/inputMode, never rely on placeholder only. |
| Checkbox/radio | Selected, unselected, disabled, invalid | Native semantics; entire label clickable; legal/marketing consent kept separate only if product policy requires. |
| Badge/access state | Preview, available, in progress, completed, expired-derived, pending, failed | Icon + text, no invented backend enum; access state comes from server/explicit customer preview config. |
| Accordion/tabs | Open/closed; selected/unselected | Keyboard support, aria-expanded/controls, logical heading/order; avoid tabs when content comparison is useful. |
| Toast/status region | Success/info/warning/error | Role/status/live region appropriate; do not use toast for persistent validation; actionable errors remain visible. |
| Dialog | Confirm, info, warning, error | Focus trap/return, Escape when safe, labelled title; no hidden destructive default. |
| Skeleton/loading | Page/card/row/form | Match content geometry; announce loading without repeated screen-reader noise. |
| Empty/error | No enrollment/no orders/no progress/network failure/permission denied | Explain next action; distinguish empty from unauthorized/unavailable. |
| Media/PDF | Loading/ready/expired/error/unsupported | Caption/transcript where available; keyboard accessible; signed URLs never treated as permanent; provide accessible download/view fallback if authorized. |

## Learning, commerce and access patterns

- Course tree shows CHAPTER vs EXAM_PREP labels and lesson/exercise hierarchy, progress, required status. Use compact cards based on GWM's scanability, while presenting the first three chapters as free preview per customer requirement.
- Quiz question uses radio group semantics; announce question count; preserve response only if safe/product approves. Never render `isCorrect` before server result.
- PDF exercise exposes QUESTION_PDF/AUDIO before completion; ANSWER_PDF/SOLUTION_VIDEO only after server confirms exercise completion.
- Checkout uses server totals; currency display follows VND Decimal convention. Pending/failed/paid are distinct; pending does not unlock content.
- Expiry is derived from `expiresAt <= now`; show history/renewal while denying paid assets according to API response.

## Accessibility acceptance checklist for later design/implementation

- WCAG 2.2 AA contrast for normal/large text, controls, focus, charts and selected states.
- Keyboard-only completion for nav, forms, accordions, quiz, media controls, dialogs and checkout.
- Visible focus not obscured by sticky headers/footers; logical focus return after drawers/dialogs.
- Semantic headings, main/nav/form labels and accessible names for icons.
- Errors identified in text, associated with input, and announced; no color-only status.
- 200% zoom/reflow and 320 px CSS viewport without two-dimensional scrolling except inherently spatial content.
- Reduced motion support; no autoplay audio; adequate target size and spacing.
