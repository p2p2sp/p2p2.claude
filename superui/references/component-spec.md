# Specs — classification & template

How to classify every inventory entry and how to document each one as a precise, framework-agnostic spec. Pair with `component-patterns.md` (detection cues); this file gives the output shape.

## Never invent details

A spec is only useful if it is true. Do NOT fabricate variants, states, property names, pixel values, or accessibility behaviours the source does not show. When a section cannot be determined, write `> NEEDS INPUT: <what's missing>` rather than guessing. If sources conflict, note the discrepancy instead of silently picking one. All values come from the design system — reference tokens by NAME, never restate a raw hex or px.

## Classification

Every entry is exactly one of:

- **Component** — a reusable block. Carries metadata:
  - `atomic` — smallest units: button, icon button, input, textarea, select, checkbox, radio, switch, slider, badge, chip, avatar, alert, tooltip, label, link, spinner, progress, divider, icon.
  - `composite` — reusable assemblies: modal/dialog, data table, card, toolbar, dropdown menu, tabs, stepper, navbar, sidebar, form group, pagination, empty state, toast stack.
- **Pattern** — components composed into a real screen or a major recurring region: app shell, list page (toolbar + table + pagination), settings form page, page-header hierarchy, dashboard grid.

`atomic`/`composite` is inventory metadata only — specs and sheets for both live flat under `components/`; patterns live under `patterns/`.

An entry is worth cataloguing if it recurs across screens OR is a self-contained reusable unit even on one screen. Composites reference the atoms they contain; patterns reference the components they compose.

## Implementation coverage — optional inventory metadata

An inventory entry MAY carry an `implemented on:` field: a free-form, comma-separated list of platform labels that the CONSUMING project defines and maintains. This plugin never enumerates, hardcodes, or suggests platform names — the label vocabulary is the host's alone.

- An absent field means coverage is NOT TRACKED for that entry. It never means "not implemented".
- The field is host knowledge, not source knowledge — it describes the consuming codebase, not the screenshots. No agent here derives or invents it; extraction only carries existing values through.
- A spec that exists but is not yet built on some platform is implementation work, bound by that spec. It is not a design gap and never routes to the extractor or the completer.

## The component spec template

Use this exact structure and order. Keep prose tight.

```markdown
# <Component Name>

**Kind:** Component (atomic | composite) · **Appears on:** <screen(s)>

## Definition
<One sentence: what this component is and its core purpose.>

## When to use
<Concrete scenarios — short bulleted list.>

## When not to use
<Misuse cases: "Don't use for X — use <other component> instead.">

## Variants
| Variant | Purpose |
|---|---|
| <name> | <what it's for> |

## States
| State | Description / trigger | Tokens |
|---|---|---|
| Default | <resting appearance> | <token refs> |
| Hover | <on pointer over> | |
| Focus-visible | <keyboard focus; focus-ring token> | |
| Active / Pressed | <during interaction> | |
| Disabled | <non-interactive; opacity token> | |
<Only the states this component actually has; add component-specific ones.>

## Anatomy
| # | Part | Description | Tokens |
|---|---|---|---|
| 1 | <Container> | <role> | <spacing/radius/surface refs> |

## Properties
| Property | Type | Options / default |
|---|---|---|
| <Variant> | enum | <options> (default <x>) |
| <Label> | text | "<default>" |

## Usage rules
**Do**
- <concrete do>

**Don't**
- <concrete don't>

## Accessibility
- **Role / semantics:** <native element or ARIA role>
- **Keyboard:** <Tab, Enter, Space, Arrows, Esc — be specific>
- **Screen reader:** <what is announced, incl. state changes>
- **Focus:** <visible indicator; focus management>
- **Contrast / target size:** <WCAG notes; reference the contrast finding>

## Composition / related components
<Composite: the child components it is built from. Atomic: commonly paired atoms. Omit if not applicable — do not pad.>

## Tokens consumed
<Flat list of every token this component references.>
```

## The pattern spec template

```markdown
# <Pattern Name>

**Kind:** Pattern · **Canonical screen:** <screen> · **Appears on:** <screens>

## Definition
<One sentence: what this pattern is and the job it does.>

## Composition
<The components it is built from, top to bottom / outside in — each a component spec reference, with its role in the pattern.>

## States
<The WHOLE pattern's states as the source shows them (e.g. Data / Empty / Loading), each described: what changes, which components show/hide.>

## Layout & geometry
<Region structure, measured surfaces per region (by the recorded elevation order), divider ownership, radii on large regions, fixed widths, grid.>

## Rules
<The pattern's own behavioural/composition rules the source demonstrates (e.g. "pagination hidden when one page"; "10 rows per page"). Only what is observed.>

## Accessibility
<Landmarks, reading order, announced counts, focus flow across the pattern.>

## Tokens consumed
<Flat list — usually via its components; list pattern-level extras.>
```

## Section guidance

- **Definition** — exactly one sentence.
- **When / When not to use** — the highest-value sections; "when not to use" always points to the correct alternative.
- **Variants vs States** — a variant is an author-time configuration (primary vs secondary); a state is a runtime condition (hover, disabled). Never mix.
- **State treatment = form + color** — for each state document FORM (left bar, filled pill, underline, ring, tint, ...) and MEASURED color, each read from pixels; map the color to the token that actually matches (often ink/`text.primary`, not the accent). Never infer from a "typical" pattern.
- **Anatomy** — reuse the source's visible vocabulary; number the parts.
- **Properties** — the configuration axes an implementation would expose (enum/boolean/text/instance), derived from observed variants; list only what the source supports, else `> NEEDS INPUT`.
- **Accessibility** — base on the WAI-ARIA Authoring Practices for that pattern (https://www.w3.org/WAI/ARIA/apg/); be specific about keys; mark unknowns.
- **Tokens** — every spec wires to the design system. A needed value with no token is a reconcile gap: report it as a MISSING-TOKENS entry; never inline the raw value as final.

See `assets/example-component-spec.md` for a complete, filled-in Button spec at the expected depth. Match that specificity throughout.
