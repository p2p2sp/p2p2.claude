# Web app reference

## Interaction states
- hover, focus-visible, active/pressed, disabled, error, loading, selected, expanded/collapsed (disclosure widgets)

## Unit mapping
- reference px @1x -> web: 1:1 CSS px, no conversion

## Component taxonomy
- Atomic: button, text input, checkbox, radio, toggle, badge, avatar, icon, tooltip, chip
- Composite: nav bar/sidebar, data table, modal/dialog, form group, card, toast/notification stack, dropdown menu, tabs, pagination, command palette

## Expected components checklist
- nav-primary - Primary navigation · composite · users need a persistent way to move between top-level sections
- button-primary - Primary button · atomic · every action-taking flow needs one clear commit control
- input-text - Text input · atomic · most data entry starts with a labeled text field
- modal-dialog - Modal dialog · composite · confirmations and focused tasks need an interruption surface
- data-table - Data table · composite · list-heavy web apps need a way to scan and act on rows
- form-validation - Inline form validation · composite · users need in-context error feedback, not a silent submit failure
- empty-state - Empty state · composite · every list or table needs a first-run or zero-result treatment
- toast-notification - Toast/notification · composite · async actions need transient status feedback
- loading-skeleton - Loading skeleton/spinner · atomic · async content needs a visible loading state
- pagination - Pagination or infinite scroll · composite · any list beyond one page needs page navigation

## Spec guidance
- click/tap target minimum 24x24 CSS px per pro-designer accessibility; do not shrink below it for icon-only controls
- any hover-only affordance needs a keyboard and touch equivalent (focus-visible state, always-visible on touch)
- focus indicator required on every interactive element, never `outline: none` without an equally visible replacement
- destructive actions (delete, remove, discard) need a confirm step or an undo window, never a silent commit
