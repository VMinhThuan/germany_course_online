# Component API reference

Public components are exported from `frontend/src/shared/ui/index.ts`. Internal styling uses `cn()` (clsx + tailwind-merge). Most components accept `className` for composition; primitive props are forwarded where appropriate.

## Actions and content primitives

- `Button`: native button plus `variant` (`primary`, `secondary`, `outline`, `ghost`, `link`, `destructive`), `size` (`sm`, `md`, `lg`, `icon`), `loading`, `startIcon`, and `endIcon`. Loading disables the control and sets `aria-busy`.
- `LinkButton`: router link styled as a button; accepts `to`, `variant`, `size`, and icon slots.
- `IconButton`: `label`, `icon`, then button props; the label is required.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`: composable content surfaces.
- `Badge`: `tone` (`info`, `success`, `warning`, `danger`, `neutral`, `preview`). `StatusBadge` maps a state and label to a badge.
- `Separator`, `Avatar`, `AvatarImage`, `AvatarFallback`, `Tooltip`, `Popover`, `AspectRatioMedia`, `VisuallyHidden`, `SkipLink`.
- Navigation: `Breadcrumbs({ items })`, `Pagination({ page, pages, onPageChange })`, `DropdownMenu({ label, items })`.
- Content/layout: `Container`, `PageHeader`, `SectionHeader`, `Stack({ gap })`, `ResponsiveGrid({ columns?, minItemWidth?, gap? })`, `ContentSection`.
- `LearningPath` and `LearningPathStep({ title, detail?, active?, done? })`: ordered, semantic learning-path display. A step outside a path throws in development.

## Form controls

- `FormField({ id, label, description?, error?, required?, optional?, children })` supplies label and description/error IDs to its child render function.
- `TextInput` forwards input props/ref and supports `leadingIcon` and `trailingAction`; `EmailInput`, `PasswordInput`, and `Textarea` are focused variants.
- `SelectField({ id, label, options, value?, onValueChange, description?, error?, disabled? })` uses Radix Select.
- `Checkbox`, `RadioGroup`, and `Switch` expose controlled state and labelled content.
- `SearchInput({ value, onChange, onClear?, label?, placeholder?, id? })` generates an ID when none is provided.
- `RHFTextInput<T>({ control, name, label, description?, ...inputProps })` binds React Hook Form field state and ARIA error relationships.
- `FormErrorSummary({ title?, errors })` renders a live error summary when errors exist.

## Feedback, dialogs, and notifications

- `InlineAlert({ tone, title?, children, action?, role? })`; `ErrorMessage`, `LoadingSpinner`, `Skeleton`, `EmptyState`, and `ErrorState` cover common status states.
- `NotificationProvider` exposes `useNotifications()`: `notify(input)`, `success(title, description?)`, `error(...)`, `warning(...)`, `info(...)`, and `dismiss(id)`. `notify` accepts `duration`, `dedupeKey`, and an optional action. The provider limits visible notifications to four.
- `DialogProvider` exposes `useDialogs()`: `confirm(request)`, `info(title, description)`, `warning(...)`, `error(...)`, and `openDialog(request)`. Confirmation may await an async handler and reports errors in the dialog. Focus returns to the element that opened the dialog.
- `BaseDialog`, `ConfirmDialog`, and `Sheet` are lower-level controlled primitives for cases that need custom content.

## Utilities

- `formatDate(value, locale = 'vi-VN')` formats with a stable UTC timezone and returns an em dash for invalid dates.
- `formatCurrency(amount, currency, locale = 'vi-VN')` delegates to `Intl.NumberFormat`; `currency` must be a supported ISO currency code.
- `cn(...values)` merges conditional Tailwind classes.

See `primitives.tsx`, `forms.tsx`, `feedback.tsx`, `notifications.tsx`, and `dialogs.tsx` for full TypeScript signatures.
