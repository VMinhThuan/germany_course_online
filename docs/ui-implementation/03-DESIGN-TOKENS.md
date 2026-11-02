# Design tokens

Tokens are defined in `frontend/src/shared/tokens/index.css`. Components use semantic Tailwind classes mapped to the CSS variables, so later product themes can adjust semantics without changing component markup.

## Brand and semantic color values

| Token                    | Value     | Intended use                                          |
| ------------------------ | --------- | ----------------------------------------------------- |
| `--brand-blue`           | `#C2E8F5` | Pastel brand surfaces and secondary action background |
| `--brand-lime`           | `#D1F685` | Pastel highlight surfaces                             |
| `--ink-primary`          | `#203039` | Main text and headings                                |
| `--ink-secondary`        | `#4A5B63` | Supporting text                                       |
| `--ink-muted`            | `#63747C` | Quiet helper text and disabled information            |
| `--action-primary`       | `#006B70` | Primary CTA, links, focus indicator                   |
| `--action-primary-hover` | `#0B5960` | Hover/active CTA                                      |
| `--page-surface`         | `#F6FBFC` | App background                                        |
| `--card-surface`         | `#FFFFFF` | Cards and dialogs                                     |
| `--surface-muted`        | `#EDF5F7` | Quiet surfaces and hover fills                        |
| `--surface-blue`         | `#EAF7FB` | Blue-tinted semantic surface                          |
| `--surface-lime`         | `#F4FBDC` | Lime-tinted semantic surface                          |
| `--border-subtle`        | `#D6E2E6` | Card and divider borders                              |
| `--border-strong`        | `#9AADB4` | Form control borders                                  |

Pastel blue and lime are backgrounds, not text colors on white. Their `pastel-*-ink` mappings resolve to primary ink for contrast. CTA teal is reserved for actions and interactive affordances.

## Status colors

| State   | Foreground | Surface   |
| ------- | ---------- | --------- |
| Success | `#176B3A`  | `#EAF6EE` |
| Warning | `#7A5A00`  | `#FFF4CC` |
| Danger  | `#B42318`  | `#FEF3F2` |
| Info    | `#1F5E85`  | `#EAF4FF` |

## Typography and shape

- Display: `Manrope Variable`, weight variable, imported locally.
- Body: `Source Sans 3 Variable`, weight variable, imported locally.
- Mono: Cascadia Code with SFMono-Regular/Consolas fallbacks.
- Base spacing step: `0.25rem`.
- Card radius: `1.25rem`; control radius: `0.75rem`.
- Shadows: low-elevation `--shadow-soft-value`; raised `--shadow-raised-value`.
- Motion: 140ms fast and 220ms standard, with reduced-motion overrides in `index.css`.
- Z layers: header 30, overlay 70, toast 90.

The full CSS token list, Tailwind names, overlay value, and keyframes are maintained in the source file. New colors should be semantic variables first, then Tailwind mappings.
