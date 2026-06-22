# Component specs — taxonomy & template

How to classify every detected component into a tier, and how to document each
one as a precise spec. Pair this with `component-patterns.md` (which gives
*detection cues* per common component); this file gives the *output shape*.

> This is the **canonical, framework-agnostic** component-spec template — the
> shared canon also consumed by **ui-component-creator** when authoring net-new
> components. Keep it framework-neutral so both producers stay in sync.

## Contents
- [Never invent details](#never-invent-details)
- [The three tiers](#the-three-tiers)
- [The spec template](#the-spec-template)
- [Section guidance](#section-guidance)
- [Per-tier adaptations](#per-tier-adaptations)

## Never invent details

A spec is only useful if it is true. Do **not** fabricate variants, states, Figma
property names, pixel values, or accessibility behaviours you cannot derive from
the source (image, CSS, description, or code). When a section can't be
determined:

1. Prefer to **ask the user** a short, specific question.
2. If you can't ask, write `> ⚠️ Needs input: <what's missing>` in that section
   rather than guessing.

If sources conflict (a screenshot shows a state the CSS doesn't implement), note
the discrepancy instead of silently picking one. All token values come from the
design system — reference them by name, never restate a raw hex or px.

## The three tiers

Classify each component into exactly one tier. Tier sets the granularity, not the
spec template (the template is shared).

| Tier | What it is | Examples |
|------|-----------|----------|
| **Layout / structural** | The persistent app skeleton; regions that frame or contain content | app shell, sidebar / nav rail, header / top bar, content area, right side panel, footer / status bar, page header, grid |
| **Composite / patterns** | Assemblies that do a job — whole flows or reusable blocks built from atoms | modal / dialog, login form, register form, 2FA form, create form, edit/update form, search + results list, data table, card with actions, toolbar, dropdown menu, tabs, stepper/wizard, empty state, toast stack |
| **Atomic / primitive** | The smallest reusable units | button, icon button, input, textarea, select, checkbox, radio, switch, slider, badge, chip/tag, avatar, alert/banner, tooltip, label, link, spinner, progress, divider, icon |

A component is worth cataloguing if it recurs across screens **or** is a
self-contained reusable unit even on one screen. Composites reference the atoms
they contain; layout components reference the composites/atoms they arrange.

## The spec template

Use this exact structure and order for every component spec. Keep prose tight —
this is reference material, not an essay. Use the component's real name.

```markdown
# <Component Name>

**Tier:** <Layout | Composite | Atomic> · **Appears on:** <screen(s)>

## Definition
<One sentence: what this component is and its core purpose.>

## When to use
<Concrete scenarios where this is the right choice — a short bulleted list of
situations, not abstract qualities.>

## When not to use
<Misuse cases, each pointing to the correct alternative. Format: "Don't use for X
— use <other component> instead.">

## Variants
| Variant | Purpose |
|---|---|
| <name> | <what it's for> |

## States
| State | Description / trigger | Tokens |
|---|---|---|
| Default | <resting appearance> | <token refs> |
| Hover | <on pointer over> | |
| Focus / Focus-visible | <keyboard focus; focus-ring token> | |
| Active / Pressed | <during interaction> | |
| Disabled | <non-interactive; opacity token> | |
| Loading | <if applicable> | |
| Error / Invalid | <if applicable> | |
| Selected / Checked | <if applicable> | |
<Only the states this component actually has. Add component-specific ones.>

## Anatomy
| # | Part | Description | Tokens |
|---|---|---|---|
| 1 | <Container> | <role> | <spacing/radius/surface refs> |
| 2 | <Leading icon> | <role> | <icon size, color> |

## Figma properties
| Property | Type | Options / default |
|---|---|---|
| <Size> | Variant | Small / Medium / Large |
| <Show icon> | Boolean | true / false |
| <Label> | Text | "<default>" |

## Usage rules
**Do**
- <concrete do>

**Don't**
- <concrete don't>

## Accessibility
- **Role / semantics:** <native element or ARIA role>
- **Keyboard:** <focusable? Tab, Enter, Space, Arrow keys, Esc — be specific>
- **Screen reader:** <what is announced, including state changes>
- **Focus:** <visible focus indicator; focus management on open/close>
- **Contrast / target size:** <WCAG notes; reference the contrast finding>

## Composition / related components
<Composite & layout: the child components it is built from. Atomic: related or
commonly paired atoms. Omit if not applicable — do not pad.>
- <Icon>, <Label>, <Spinner>, …

## Tokens consumed
<Flat list of every design-system token this component references, so a token
change is traceable to the components it affects.>
```

## Section guidance

- **Definition** — exactly one sentence. If you can't state the purpose in one
  sentence, gather more input.
- **When / When not to use** — the highest-value sections for preventing misuse.
  "When not to use" must always point to the correct alternative component.
- **Variants vs. States** — keep distinct. A *variant* is an author-time
  configuration (primary vs. secondary button); a *state* is a runtime condition
  (hover, disabled). Never list "primary" as a state or "hover" as a variant.
- **Anatomy** — use the names from the design file / codebase so designers and
  engineers share vocabulary; reuse source layer names verbatim where present.
- **Figma properties** — the component property / variant axes (Variant, Boolean,
  Instance Swap, Text). List only what you can confirm. With code but no Figma
  file, derive likely properties from props and mark the section
  `> ⚠️ Needs input: confirm against the Figma component`.
- **Accessibility** — base behaviour on the component's nature and the WAI-ARIA
  Authoring Practices for that pattern (button, combobox, dialog, tabs…). Be
  specific about keys. Don't assert behaviour you can't ground; mark unknowns.
  Authoritative reference: the current WAI-ARIA Authoring Practices Guide
  (https://www.w3.org/WAI/ARIA/apg/).
- **Tokens** — every spec must wire to the design system. If a component needs a
  value with no token, that's a Phase 5 reconcile gap: add the token first.

## Per-tier adaptations

The template fits all tiers; adapt these sections:

- **Layout / structural:** Variants/States still apply (sidebar
  collapsed/expanded, panel open/closed). "Figma properties" is often N/A — mark
  `⚠️ Needs input` or omit. "Composition" lists the regions/composites it
  arranges, with their layout (flex/grid, gaps, alignment, fixed widths, sticky
  vs. scroll).
- **Composite / patterns:** focus "Anatomy" on the sub-blocks and the flow
  (e.g. a login form: fields, validation, submit, error summary, secondary
  links). "Composition" lists the atoms used. Document empty/loading/error states
  of the whole pattern.
- **Atomic / primitive:** the template applies most directly. "Composition" lists
  paired atoms (e.g. Button → Icon, Spinner). These specs are the foundation the
  composites reference.

See `assets/example-component-spec.md` for a complete, filled-in Button spec at
the expected depth. Match that level of specificity throughout.
