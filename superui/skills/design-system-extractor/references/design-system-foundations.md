# Design system foundations — completeness map for DESIGN.md

A good design system is more than a token file plus an inventory. This reference names **every aspect a complete system describes**, so nothing slips through. Use it as a coverage checklist that sits above the detail references:

- token shape lives in `dtcg-token-format.md`
- component/pattern detection lives in `component-patterns.md`
- spec template + classification lives in `component-spec.md`
- this file is the map of what a system contains and how the pieces relate.

Everything here obeys the extraction's operating principles: **measure, do not guess; one source of truth; never fabricate** a value the source does not show — record `null` + `$description` / `> NEEDS INPUT` instead.

## The three layers

The extracted system is organized in three layers, from raw material to finished screens:

- **Foundations** — color, type, spacing & radius, effects, motion. The raw material, all bound to tokens (`dtcg.yml`) and documented in DESIGN.md + per-foundation sheets.
- **Components** — reusable building blocks (button, chip, input, navbar, ...) assembled only from foundation tokens. Flat list; `atomic` vs `composite` is inventory metadata, not a directory split.
- **Patterns** — how components come together into real screens or major screen regions. Each pattern spec records composition, whole-pattern states, and rules.

## 1. Principles & single source of truth

- **Single source of truth.** Each raw value exists once (a primitive). Semantic tokens, specs, and CSS all reference it — never restate it. This is what makes a later color/spacing change propagate everywhere.
- **Observed principles, not invented ones.** If the source reveals a guiding rule (e.g. "elevation is shown with color, not shadow"; "one 8 px spacing rhythm"; "fully rounded controls"), record it as a short principle in DESIGN.md. Do not author aspirational principles the design does not demonstrate.

## 2. Token hierarchy — three tiers

- **Primitive** (reference/global) — raw values: a hex, a px step, a font size. Never used directly in UI; names carry no meaning (`gray.900`, `spacing.4`).
- **Semantic** (alias) — purpose-named refs: `color.text.primary`, `radius.control`. The everyday layer UI consumes.
- **Component** (scoped) — per-component refs: `button.bg`. Only when a value must NOT leak into the global vocabulary; aliases a semantic token, never a primitive directly. Keep sparse.

Aliasing rule: semantic → primitive, component → semantic. Never duplicate a raw value; alias up the chain.

## 3. Visual foundations — extraction coverage checklist

The categories a complete system defines. Tagged **[universal]** (translates to any target incl. mobile) or **[web-only]** (`hover`, `focus-ring`, `breakpoints`, `z-index` — a mobile adapter ignores or remaps them).

- **Color** — [universal] surfaces/backgrounds, text (primary/secondary/disabled), borders, brand/accent, state colors (success/warning/error/info), overlay. Per-hue ramps only where the design clearly has one. Focus-ring color is [web-only].
- **Typography** — [universal] families, size scale, weights, line-heights, letter-spacing; named text styles as `typography` composites.
- **Spacing** — [universal] the spacing scale (snap to a base step only if the design uses one); padding and gap rhythm.
- **Grid / layout** — [universal] column structure, container/content max-widths, gutters, fixed region widths of the app shell.
- **Elevation** — [universal] how depth is shown: shadow ramp and/or surface-color steps; record which mechanism the design uses. Surface order is MEASURED, never assumed: sample every major region's background with `sample_colors.py --regions` and adopt the printed luminance order (darkest = `surface.base`). Record the resulting order explicitly in DESIGN.md; when two adjacent regions differ, state which is raised relative to the other.
- **Radius** — [universal] the corner-radius scale, including "full" for pills/avatars AND large-surface/panel/shell radii.
- **Border** — [universal] widths and the border composite.
- **Iconography** — [universal] icon size step(s) and stroke style.
- **Sizing** — [universal] control heights, avatar sizes, min target size.
- **Opacity** — [universal] disabled / loading / scrim opacities.
- **Motion** — [universal] durations + easing where animation is visible or implied by a state (collapse, modal open).
- **Hover** — [web-only] pointer-over affordances.
- **Focus ring** — [web-only] the visible focus-visible indicator and its `color.focus` / `shadow.focus` token.
- **Breakpoints** — [web-only] target viewport widths if more than one screen size is given.
- **Z-index** — [web-only] layering order for sticky bars, overlays, modals.

## 4. Theming

A **theme** swaps token values behind stable semantic names, so UI never changes. Modes are themes: light, dark, high-contrast, non-color modes.

- Semantic token names stay stable across themes; only the primitive each one aliases differs.
- L1 records dark in the tokens themselves: a token whose value differs in dark carries the complete replacement in `$extensions.org.superui.dark` (same shape/type; aliases allowed — see `dtcg-token-format.md`). That extension is the ONLY source of truth for dark.
- `tokens.css` is derived, pure CSS: `:root` (light) + `.dark` overrides generated from the extensions by `tokens_to_css.py`.
- **Never fabricate** the dark palette. No dark screens in the source = no dark extensions (the generated `.dark` block stays a TODO scaffold); say so in DESIGN.md instead of inventing values.

## 5. Component & pattern library

Detection cues live in `component-patterns.md`; the spec template and the component/pattern classification live in `component-spec.md`. For each entry document anatomy, variants, **states** (form + color, measured), the tokens it consumes (by name), and accessibility. Every spec relies on tokens so a token change propagates; a value with no token is a reconcile gap — the token is added first, the spec never carries a raw value.

## 6. Consistency & usage rules

Beyond individual blocks, the system records **rules that keep it coherent**. Capture in DESIGN.md (and honour in every spec):

- **Visual-consistency rules** observed across the UI: one corner-radius scale, one elevation system, a single icon grid, consistent control height, a shared spacing rhythm.
- **Accent discipline** — from the accent-usage inventory, list every location the chromatic accent is ALLOWED (e.g. "accent = selection / calendar only, never nav"). Any spec reaching for it elsewhere is a reconcile failure to resolve against the source.
- **State treatment = form + color** — for every interactive state document both its FORM (left bar, filled pill, underline, ring, tint, ...) and its MEASURED color. Never infer a state from a "typical" pattern; the measured color often maps to ink/`text.primary`, not the accent.
- **Usage notes** only where the design demonstrates them: variant choice rules, composition patterns, empty/loading conventions.

## 7. Accessibility (system level)

Per-entry a11y lives in each spec; these are the system-wide checks for DESIGN.md:

- **Color contrast (WCAG 2.x AA):** body text ≥ 4.5:1; large text and UI components/graphical objects ≥ 3:1. Read actual fg/bg pairs with `sample_colors.py` and compute ratios; a failing pair is recorded as an observation, never silently "fixed".
- **Focus visibility:** a visible indicator must exist; captured as a token so specs can reference it.
- **Keyboard & semantics:** interactive elements reachable and operable; correct roles/landmarks; accessible names for icon-only controls.
- **Target size:** targets should not undercut the control-height token.
- **Don't rely on color alone** for state — look for a secondary cue and document whether one exists.

## Where each aspect lands

- 1 Principles — DESIGN.md (principles section); token structure.
- 2 Token tiers — `dtcg.yml`; explained in DESIGN.md.
- 3 Visual foundations — `dtcg.yml`; per-foundation HTML sheets.
- 4 Theming — `dtcg.yml` extensions → `tokens.css`; DESIGN.md theming section.
- 5 Components & patterns — `inventory.md` + per-entry specs and sheets.
- 6 Consistency rules — DESIGN.md; enforced across specs.
- 7 Accessibility — DESIGN.md notes; per-entry spec sections.
