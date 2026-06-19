# Showcase patterns

How to turn a component spec into a faithful showcase page, which app pages and
layouts to generate, and how to keep everything traceable to the design system.

## Contents
- [The rule that prevents broken mockups](#the-rule-that-prevents-broken-mockups)
- [Component showcase: spec → page](#component-showcase-spec--page)
- [Rendering states (the forced-state convention)](#rendering-states-the-forced-state-convention)
- [Surfacing gaps](#surfacing-gaps)
- [Per-tier patterns](#per-tier-patterns)
- [The standard page set](#the-standard-page-set)
- [Layouts](#layouts)

## The rule that prevents broken mockups

A utility class only works if a matching variable exists in the injected
`theme.css`. **Resolve every class against `theme.css`, not against the token
dot-paths in the spec.** A spec lists `color.surface.accent`; the generated
utility is whatever the converter produced for it (commonly a short semantic
name like `bg-surface` / `bg-accent`). Grep the theme for the variable, use the
real utility. A class with no backing variable renders unstyled — that is the
single most common defect, and it is on you, not the design system.

## Component showcase: spec → page

For each component spec (`components/<tier>/<name>.md`), the showcase page has
four parts, in order:

1. **Header** — component name, tier, "appears on", and the one-sentence
   Definition. Chrome-styled.
2. **Variants** — one labeled sample per row in the spec's *Variants* table,
   rendered in its Default state. This is the at-a-glance "do the variants look
   right and distinct?" view.
3. **States** — for the canonical variant (usually the first/primary), one
   labeled sample per row in the spec's *States* table, using the forced-state
   convention below. Plus **one interactive sample** wired to `data-state-toggle`
   controls so a reviewer can flip through states live.
4. **Tokens consumed** — a chrome-styled strip listing the spec's "Tokens
   consumed" entries, so a reviewer can trace which design-system tokens this
   component depends on.

Use the component's real semantic HTML element (a `button` for Button, `input`
for Input, `dialog`/role for modal) so the mockup also sanity-checks the
accessibility intent in the spec.

Variants and states are different axes — never collapse them. A *variant* is an
author-time choice (Primary vs Ghost); a *state* is runtime (Hover, Disabled).
Show variants in one block, states in another.

## Rendering states (the forced-state convention)

CSS cannot force `:hover`, `:focus-visible`, or `:active` from markup, so a
static "Hover" sample cannot rely on the real pseudo-class. Convention:

- **Default, Disabled, Loading, Error, Selected** — apply directly. Disabled
  uses the real `disabled` attribute (and the disabled utilities); the others
  use the state's documented classes/markup.
- **Hover, Focus-visible, Active** — these have a real interactive form and a
  forced static form:
  - *Static grid sample:* apply the same declarations the pseudo-class would,
    but unconditionally (e.g. if hover is `hover:bg-surface-hover`, the static
    sample uses `bg-surface-hover` plus a chrome label "Hover"). This makes the
    state visible without interaction.
  - *Interactive sample:* leave the real `hover:`/`focus-visible:` utilities in
    place so pointer/keyboard genuinely trigger them, and additionally wire a
    `data-state-toggle` button to force the class for reviewers without a mouse.

Only render the states the spec actually lists. If the spec marks a state
`⚠️ Needs input`, render the gap card (below) for that state instead of guessing
its appearance.

## Surfacing gaps

The mockups exist to reveal what is incomplete. When a spec section is missing
or marked `⚠️ Needs input: <x>`:

- Render a visible, chrome-styled placeholder card containing the exact note,
  e.g. a bordered box reading `⚠️ Needs input: focus-ring color not in source`.
- Do **not** invent the missing markup, color, or state.
- Collect every gap so Phase 6 can report them to the user.

Never hide a gap behind plausible-looking markup — a silently-filled gap is
worse than a flagged one, because it passes review while being unverified.

## Per-tier patterns

- **Atomic** — the four-part showcase above applies directly. These are the
  foundation; render them first so composite pages can reuse the same markup.
- **Composite** — showcase the assembled block (form, modal, table, dropdown)
  and its whole-pattern states: empty, loading, error/validation, populated.
  Build it from the atomic markup you already authored, not from scratch, so the
  mockup also tests that the atoms compose cleanly.
- **Layout / structural** — these become `layouts/` pages, not component cards.
  Show the region (sidebar, header, content) at its documented sizes, and its
  variants (sidebar collapsed/expanded, panel open/closed) as separate samples
  or a toggle.

## The standard page set

Always generate these app pages under `pages/` (each built from documented
components, in the design system's own style):

- `login` — email/password form, submit, secondary links (forgot password, sign
  up), error summary state.
- `signup` — registration form per the register/create composite spec if present.
- `password-reset` — request + confirmation states.
- `error-404` — not-found page.
- `error-500` — server-error page.

Then add one page per **composite form** spec that the design system documents
beyond the above (e.g. 2FA, search-and-results, create/edit). Derive the fields
and states from the spec — do not introduce fields the spec does not define.

If a standard page has no supporting components in the design system (e.g. no
form atoms were extracted), render it with a gap card explaining what is missing
rather than inventing inputs.

## Layouts

- `layout_base.html` — the application shell from the layout-tier specs: header
  / top bar, sidebar or nav rail, main content region, optional right panel and
  footer, at their documented widths/spacing and sticky/scroll behavior. This is
  the frame the app pages conceptually live inside.
- `layout_showcase.html` — a single "kitchen sink" page that places many
  components together (headings, buttons, inputs, cards, table, alerts) in
  realistic proximity. Its job is to expose rhythm and spacing inconsistencies
  that isolated component cards hide — mismatched gaps, clashing radii, uneven
  type scale.

Generate one additional layout file per distinct layout component the design
system documents. If only one app shell exists, `layout_base` plus
`layout_showcase` is enough.
