# Design system foundations — completeness map

A good design system is more than a token file plus a component list. This
reference names **every aspect a complete system describes**, so the extractor
knows the full target shape and nothing slips through. Use it as a coverage
checklist that sits *above* the detail references:

- token *shape* lives in `dtcg-token-format.md`
- component *detection* lives in `component-patterns.md`
- component *spec template + taxonomy* lives in `component-spec.md`
- this file is the *map of what a system contains* and how the pieces relate.

Everything here must still obey the skill's operating principles: **measure, do
not guess; one source of truth; never fabricate** a value the source does not
show — record `null` + `$description` instead.

## Contents
1. [Principles & single source of truth](#1-principles--single-source-of-truth)
2. [Token hierarchy — three tiers](#2-token-hierarchy--three-tiers)
3. [Visual foundations — coverage checklist](#3-visual-foundations--extraction-coverage-checklist)
4. [Theming](#4-theming)
5. [Component library](#5-component-library)
6. [Patterns & usage / consistency rules](#6-patterns--usage--consistency-rules)
7. [Accessibility](#7-accessibility-foundation-level)
- [Where each aspect is produced](#where-each-aspect-is-produced)

---

## 1. Principles & single source of truth

A design system encodes design decisions once and lets everything else reference
them, so design and code stay aligned. Two consequences for extraction:

- **Single source of truth.** Each raw value exists once (a primitive). Semantic
  tokens, component specs, and CSS all *reference* it — never restate it. This is
  what makes a later color/spacing change propagate everywhere.
- **Observed principles, not invented ones.** If the source reveals a guiding
  rule (e.g. "elevation is shown with color, not shadow"; "one 8 px spacing
  rhythm"; "fully rounded controls"), record it as a short principle in
  `foundations.md`. Do not author aspirational principles the design does not
  demonstrate.

## 2. Token hierarchy — three tiers

Tokens are named key–value pairs holding design decisions in a platform-agnostic
form. A mature system layers them in **three tiers**, each adding abstraction:

| Tier | Also called | Holds | Used directly in UI? |
|------|-------------|-------|----------------------|
| **Primitive** | reference / global | raw values: a hex, a px step, a font size | No — names carry no meaning |
| **Semantic** | alias | purpose-named refs: `color.text.primary`, `radius.control` | Yes — this is the everyday layer |
| **Component** | scoped | per-component refs: `button.bg`, `sidebar.item.active.bg` | Yes — only inside that component |

This skill already builds tiers 1–2 (see Phase 1, "token tiers"). Add a
**component token** only when a component needs a value that should *not* leak
into the global vocabulary — e.g. a button background that must stay
independently themeable. A component token aliases a semantic token
(`button.bg → {color.accent.500}`), never a primitive directly. Keep component
tokens sparse: most components should consume semantic tokens straight.

Aliasing rule (all tiers): semantic → primitive, component → semantic. Never
duplicate a raw value; alias up the chain.

## 3. Visual foundations — extraction coverage checklist

These are the foundation categories a complete system defines. Phase 1 already
extracts most; treat this as the "did I miss one?" list. Each is a `dimension`,
`color`, or composite token unless noted.

- **Color** — surfaces/backgrounds, text (primary/secondary/disabled), borders,
  brand/accent, state colors (success/warning/error/info), focus ring, overlay.
  Group into a per-hue ramp where the design clearly has one.
- **Typography** — font families, the size scale, weights, line-heights,
  letter-spacing; named text styles as `typography` composite tokens.
- **Spacing** — the spacing scale (snap to a base step only if the design uses
  one); padding and gap rhythm.
- **Grid / layout** — column structure, container/content max-widths, gutters,
  the fixed region widths of the app shell.
- **Elevation** — how depth is shown: shadow ramp (`shadow` composite) *and/or*
  surface-color steps. Record which mechanism the design uses (some systems use
  color for elevation, not shadows) — this is a principle worth noting.
- **Radius** — corner-radius scale, including any "full" radius for pills/avatars.
- **Border** — widths and the border composite (width + style + color).
- **Iconography** — the icon size step(s) and stroke style; whether icons share
  one grid.
- **Sizing** — control heights (button/input/row), avatar sizes, min target size.
- **Opacity** — disabled / loading / scrim opacities as `number` tokens.
- **Motion** — durations + easing (`duration` + `cubicBezier`) where animation
  is visible or implied by a state (collapse, modal open).
- **Breakpoints** — target viewport widths if more than one screen size is given.
- **Z-index** — layering order (`number`) for sticky bars, overlays, modals.

## 4. Theming

A **theme** is a set of token *values* chosen to achieve one look; switching
themes means swapping values behind the *same semantic token names*, so UI code
never changes. Modes are themes: light, dark, high-contrast, and non-color modes
(compact/comfortable, reduced motion) all qualify.

How this maps to the skill's outputs:

- Keep semantic token *names* stable across themes; only the primitive each one
  aliases differs per theme.
- A dark theme is a **parallel set of values** mirroring the light tokens but
  referencing different primitives — not a rename.
- This is exactly what the Tailwind/shadcn generators expect: light values in
  `:root`, dark in `.dark`, semantic names identical across both (see
  `tailwind-v4-mapping.md` and `shadcn-mapping.md`).
- **Never fabricate** the dark (or alternate) palette. If only a light screen was
  provided, leave the dark values as a TODO scaffold and tell the user, rather
  than inventing them. (The `--shadcn` converter already does this.)

## 5. Component library

The reusable building blocks and their specs. Detection lives in
`component-patterns.md`; the spec template + three-tier taxonomy live in
`component-spec.md`. For each component document anatomy, layout, **variants**,
**states** (default/hover/focus/active/disabled/error/empty/loading — mark
inferred vs. visible), the tokens it consumes (by reference name), and
accessibility notes. Every component must rely on tokens so a token change
propagates automatically; flag any raw value a component needs that is not yet a
token (Phase 5 reconcile).

## 6. Patterns & usage / consistency rules

Beyond individual components, a system records **how pieces combine** and the
rules that keep it coherent. Capture in `foundations.md` (and reflect in the
relevant specs):

- **Visual-consistency rules** observed across the UI: one corner-radius scale,
  one elevation system, a single icon size, consistent control height, a shared
  spacing rhythm. (See the consistency checklist in `component-patterns.md`.)
- **Usage notes** where the design shows them: when a variant is used vs.
  another (e.g. primary vs. secondary button), composition patterns (page
  header + content + side panel), empty/loading patterns. Document only what the
  source demonstrates.

## 7. Accessibility (foundation level)

Per-component a11y lives in each component spec; these are the system-wide
checks. Note findings in `foundations.md` and honour them in every spec.

- **Color contrast (WCAG 2.x AA):** body text ≥ 4.5:1 against its background;
  large text (≥ 24 px, or ≥ 19 px bold) and UI components/graphical objects
  (icons, borders that convey state, focus ring) ≥ 3:1. AAA is 7:1 for body
  text. Use `sample_colors.py` to read the actual fg/bg pairs and compute ratios
  rather than eyeballing; if a sampled pair fails, record it as an observation
  (do not silently "fix" the source palette).
- **Focus visibility:** a visible focus indicator must exist; capture the focus
  ring as a token (`color.focus` / `shadow.focus`) so each spec can reference it.
- **Keyboard & semantics:** interactive elements are reachable and operable by
  keyboard; use correct roles/landmarks (`nav`, `dialog`, `menu`), `aria-*`
  state (`aria-expanded`, `aria-current`), and accessible names for icon-only
  controls.
- **Target size:** interactive targets should not be smaller than the design's
  control-height token; note any that look too small.
- **Don't rely on color alone** to convey state (error, active) — look for a
  secondary cue (icon, weight, underline) and document whether one exists.

---

## Where each aspect is produced

| Aspect (1–7) | Phase | Output |
|--------------|-------|--------|
| 1 Principles / single source of truth | 1–2 | `foundations.md` notes; token structure |
| 2 Token tiers (primitive/semantic/component) | 1 | `design-tokens.yaml` |
| 3 Visual foundations | 1 | `design-tokens.yaml` |
| 4 Theming | 1, 3 | tokens (parallel values) → `theme.css` / `globals.css` |
| 5 Component library | 4, 6 | `components/inventory.md` + per-component specs |
| 6 Patterns / consistency rules | 2, 4 | `foundations.md`; inventory |
| 7 Accessibility | 2, 6 | `foundations.md` notes; per-component specs |
