# Button

**Kind:** Component (atomic) · **Appears on:** all screens (toolbar, modal footer, forms)

## Definition
A clickable control that triggers an action or submits a form in the current context.

## When to use
- Triggering an action: save, delete, submit, open a dialog, run a process.
- The primary or secondary call-to-action in a form, toolbar, or modal footer.
- Confirming or cancelling inside a dialog.

## When not to use
- Don't use a Button for navigation between pages — use a Link instead.
- Don't use a Button for binary on/off settings — use a Switch instead.
- Don't use a Button as a tab — use Tabs instead.

## Variants
| Variant | Purpose |
|---|---|
| Primary | The single most important action in a context |
| Secondary | Supporting actions alongside a primary |
| Ghost | Low-emphasis actions (toolbars, table rows) |
| Destructive | Irreversible/dangerous actions (delete) |

## States
| State | Description / trigger | Tokens |
|---|---|---|
| Default | Resting | `color.accent.default`, `color.text.on-accent`, `radius.control` |
| Hover | Pointer over | `color.accent.hover` |
| Focus-visible | Keyboard focus | `shadow.focus` (`color.focus`) |
| Active / Pressed | During press | `color.accent.active` |
| Disabled | Non-interactive | `opacity.disabled`, cursor not-allowed |
| Loading | Action in progress; label swapped for spinner, control stays sized | `motion.duration.fast` |

## Anatomy
| # | Part | Description | Tokens |
|---|---|---|---|
| 1 | Container | Padded, rounded clickable box | `spacing.2` / `spacing.4`, `radius.control`, `border.control` |
| 2 | Leading icon | Optional icon before the label | `size.icon`, `color.text.on-accent` |
| 3 | Label | The action text | `typography.label`, `color.text.on-accent` |
| 4 | Trailing icon | Optional icon after the label (e.g. caret) | `size.icon` |
| 5 | Spinner | Replaces content in the loading state | `color.text.on-accent` |

## Properties
| Property | Type | Options / default |
|---|---|---|
| Variant | enum | Primary / Secondary / Ghost / Destructive (default Primary) |
| Size | enum | Small / Medium / Large (default Medium) |
| Leading icon | boolean | true / false (default false) |
| Trailing icon | boolean | true / false (default false) |
| State | enum | Default / Hover / Focus / Active / Disabled / Loading |
| Label | text | "Button" |

## Usage rules
**Do**
- Use one Primary button per context; everything else Secondary or Ghost.
- Lead with a verb ("Save changes", not "OK").
- Keep the loading state the same width as default to avoid layout shift.

**Don't**
- Don't place two Primary buttons side by side.
- Don't use Destructive for reversible actions.
- Don't disable the only path forward without explaining why.

## Accessibility
- **Role / semantics:** native `button` element (`type="button"`, or `submit` inside a form).
- **Keyboard:** focusable via Tab; activates on Enter and Space.
- **Screen reader:** announced as "<label>, button"; disabled announced as unavailable; loading should expose `aria-busy="true"`.
- **Focus:** visible focus ring (`shadow.focus`) meeting 3:1 contrast against the background; never remove the indicator.
- **Contrast / target size:** label/background ≥ 4.5:1 (sampled pair passes AA); hit target ≥ the `size.control` height.

## Composition / related components
- Icon (leading/trailing), Label, Spinner (loading).

## Tokens consumed
`color.accent.default`, `color.accent.hover`, `color.accent.active`,
`color.text.on-accent`, `color.focus`, `radius.control`, `border.control`,
`spacing.2`, `spacing.4`, `size.icon`, `size.control`, `typography.label`,
`shadow.focus`, `opacity.disabled`, `motion.duration.fast`.
