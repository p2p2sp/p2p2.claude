---
name: extract-design-system
description: Use when the user provides a folder of UI screenshots or a website URL and wants to reverse-engineer a framework-agnostic design system from it. Triggers: "extract a design system", "build design tokens from these screens", "document the components in this UI", "turn this site into a design system", "reverse-engineer this UI/website", a filesystem path to a screenshots directory, or a URL to take inspiration from. Source-only: produces DTCG design tokens (YAML), a foundations document, a pure-CSS tokens.css (no framework coupling), and a tiered component catalog — layout, composite, and atomic — each with a detailed spec covering variants, states, anatomy, Figma properties, usage rules, and accessibility. Does not target any UI framework or build HTML mockups; per-target adaptation is the separate adapt-target skill, web preview is web-preview.
allowed-tools: Bash(sh:*)
---

# System Design Extractor

Turn a source UI — a folder of screenshots or a website URL — into a detailed,
self-contained, **framework-agnostic design system**: DTCG design tokens, a
foundations document, a pure-CSS `tokens.css`, and a **tiered catalog of
components**, each documented with a full spec. This is the L1 core: it
reverse-engineers the *source* into one neutral system that downstream skills
adapt per target. Run manually: the user names the source in the prompt.

## Python preflight

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs this skill's Python check at load. If it reads `PYTHON_MISSING`,
tell the user this skill's `*.py` steps need **Python 3** (install it; on Windows make
sure `python` or `py` is on `PATH`) and **stop before any `python …` step**. If it reads
`PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in every `python …` command below.

## Operating principles

These shape every step.

- **Measure, do not guess.** Token and spec values come from the source — pixels
  (images) or CSS (URL) — not from memory of "typical" systems. If a value
  cannot be determined, record `null` with a `$description` saying why; in a spec
  write `> ⚠️ Needs input: <what's missing>`. Never fabricate.
- **References say what to LOOK FOR, never what to ASSUME.** Any "typical" value,
  color role, or state treatment named in a reference is a detection hint, not a
  default. Every assigned value — including the FORM and COLOR of state treatments
  and the surface/elevation order of regions — comes from a re-sample or CSS, not
  from the hint.
- **One source of truth.** Each raw value lives once as a primitive token;
  semantic tokens, the theme CSS, and every component spec reference it by name —
  never restate a hex or px.
- **Ask when ambiguous, never assume.** If the source is unclear, the canonical
  screen for a shared component is uncertain, or an element is cropped/occluded,
  ask before proceeding.
- **Scope = the agnostic design system, not a framework target or mockups.** This
  skill ends at the documented, framework-neutral system. Adapting it to a target
  (`pure-css` / `tailwind` / `react-shadcn` / `react-mui` / `flutter`) is the
  separate **adapt-target** skill; building live HTML previews is **web-preview**.
  Offer the next step (see Related skills) — do not bake framework knowledge here.

## Source intake — directory or URL

The user supplies one of two source types. Detect which and read it fully before
extracting.

- **Screenshots directory** (a user-provided path — typically a project
  assets folder): `view` the directory, then `view` every image so you
  actually see it. Run
  `${CLAUDE_SKILL_DIR}/scripts/sample_colors.py` per image to read exact colors. Estimate spacing
  and sizes against a known reference in the image (a 16 px body line, a 40 px
  avatar), not round numbers.
- **Website URL** (a page to take inspiration from): retrieve it with the
  **`web_fetch` tool** (not bash — sandbox egress is restricted). Fetch the page,
  then its linked stylesheets, and read **exact values from the CSS**: custom
  properties (`--*`), `color`, `font-*`, spacing, `border-radius`, `box-shadow`,
  breakpoints. CSS gives precise values — prefer it over estimation. If you also
  need to see layout/components and a screenshot tool is available, capture and
  `view` it; otherwise infer structure from the DOM and CSS.

Note the target viewport(s) (desktop ~1280–1440, tablet, mobile) so measurements
are consistent.

## Outputs

Write everything under `.superui/layout/design-system/` (default; the user may override):

| File | What it is |
|------|------------|
| `design-tokens.yaml` | DTCG tokens — primitive + semantic (+ sparse component), serialized as YAML |
| `foundations.md` | The extracted foundations: principles, token tiers, visual foundations, theming, consistency rules, accessibility |
| `tokens.css` | Pure-CSS custom properties — semantic token names as `:root` (light) + `.dark` (dark) declarations; no framework, no build step |
| `components/inventory.md` | The tiered component catalog (layout → composite → atomic) — the list shown to the user |
| `components/<tier>/<name>.md` | One detailed spec per identified component |

## Workflow

Phases in order. 1–3 build the system core; 4 catalogs components; 5 reconciles;
6 writes the specs; 7 verifies fidelity against the source.

### Phase 0 — Intake

1. Detect the source type (directory vs. URL) and read it per "Source intake".
   A prompt mentioning a source does not guarantee one is present — check.
2. If scope is unclear (which screens are canonical, which states matter), ask a
   short question rather than guessing.

### Phase 1 — Extract design tokens

Read `references/dtcg-token-format.md` (YAML shape, types, sRGB color object,
composites, aliasing). Skim `references/design-system-foundations.md` §3 for the
full foundations coverage checklist so no category is missed.

1. **Colors** — exact palette (sampled pixels or CSS); deduplicate near-identical
   colors into one primitive; build a per-hue ramp where the design clearly has
   one. Cover surfaces, text, borders, brand/accent, states, focus ring, overlay.
   **Surface/elevation order is measured, not assumed:** sample the background of
   every major region (page/canvas, sidebar, content panel, topbar, cards, menus)
   with `${CLAUDE_SKILL_DIR}/scripts/sample_colors.py --regions` and assign `surface.base / raised /
   muted / overlay` by the printed luminance order (darkest = base); record that
   order in `foundations.md`. Never assign surfaces by convention.
2. **Typography** — families (by shape if unlabeled — say so), size scale,
   weights, line-heights, letter-spacing; named text styles as `typography`
   composites.
3. **Dimensions** — spacing, radii, border widths, icon sizes, control heights,
   container widths, breakpoints; snap to a base step only if the design uses one.
4. **Effects** — `shadow`/`border`/`gradient` composites, `opacity` and `zindex`
   as `number`, `motion` (`duration` + `cubicBezier`) where visible.
5. **Token tiers** (see foundations §2): **primitive** (raw values, never used
   directly) → **semantic** (purpose-named aliases like `color.text.primary`,
   `radius.control`) → **component** (scoped, only when a value must not leak
   globally, e.g. `button.bg`; keep sparse). Alias up the chain; never duplicate a
   raw value.

Write `design-tokens.yaml`, then validate and fix every error:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/validate_tokens.py .superui/layout/design-system/design-tokens.yaml
```

**Accent-usage inventory.** Before moving on, enumerate every location the
chromatic accent/highlight color appears in the source (e.g. "accent.500 appears
only on the selected calendar-day ring"). This list becomes the foundations
"accent discipline" rule (Phase 2) and the cross-check baseline (Phase 5).

### Phase 2 — Write the foundations document

Using `references/design-system-foundations.md` as the map, write
`foundations.md`: the observed design principles, the token tiers, the visual
foundations summary, the theming approach, the cross-component consistency rules,
and the system-wide accessibility notes. Reference tokens by name; state any
assumptions and unresolved values explicitly.

### Phase 3 — Emit `tokens.css` (pure CSS, framework-agnostic)

Write `tokens.css` — the agnostic theming artifact — as plain CSS custom
properties keyed by **semantic token name**, no framework syntax and no build
step. Each semantic token becomes one `--<token-name>` declaration; light values
go in `:root`, the dark parallel set in `.dark`. Reference primitives only behind
the semantic names so a target adapter can map them cleanly later.

```css
:root {
  --color-surface-base: #ffffff;
  --color-text-primary: #111827;
  --radius-control: 8px;
  /* …one line per semantic token… */
}
.dark {
  --color-surface-base: #0b0f17;
  --color-text-primary: #f4f6fb;
  /* …parallel values, same names… */
}
```

**Theming.** A theme swaps token *values* behind stable semantic *names* (light
in `:root`, dark in `.dark`); a dark theme is a parallel value set aliasing
different primitives, not a rename. **Never fabricate** an alternate palette — if
only light screens were given, leave the `.dark` block as a TODO scaffold and
tell the user.

**Targets are downstream.** Do **not** generate Tailwind, shadcn, MUI, Flutter,
or any other framework theme here. `tokens.css` is the single neutral source the
**adapt-target** skill consumes to produce each per-target theme artifact.

### Phase 4 — Identify components in three tiers

Read `references/component-patterns.md` (detection cues, anatomy, states, tokens,
a11y per common block) and `references/component-spec.md` (the three-tier
taxonomy + the spec template). Scan every screen/page and classify each detected
component into one tier:

- **Layout / structural** — the app skeleton: app shell, sidebar/nav rail,
  header/top bar, content area, right side panel, footer, page header, grid.
- **Composite / patterns** — assembled flows and blocks: modal/dialog, forms
  (login, register, 2FA, create, edit, search), data table, card with actions,
  toolbar, search + results list, dropdown menu, tabs, stepper, empty state.
- **Atomic / primitive** — smallest reusable units: button, input, select,
  checkbox, radio, switch, slider, badge, chip, avatar, alert, tooltip, link,
  spinner, progress, divider, icon.

Write `components/inventory.md` grouping components under the three tiers, and
**list the same inventory to the user** in your reply (general → composite →
detailed), so they see what was identified before the full specs land.

### Phase 5 — Reconcile

Cross-check tokens ↔ components. If a component reveals a value not yet tokenized
(e.g. a focus-ring color, a card radius), add it as a token and re-run
`validate_tokens.py`. Every distinct visual value a component uses must exist as
a token before it is specced.

Then cross-check each component's token **assignments** against the foundations
consistency rules — not just token existence: accent discipline (no spec uses the
accent outside its allowed locations), the radius role set, and the measured
elevation order. Any contradiction (e.g. a nav spec using `color.accent.*`, or a
sidebar marked `raised` against the sampled order) is flagged and resolved against
the source before specs are finalized.

### Phase 6 — Write detailed component specs

Read `assets/example-component-spec.md` for the expected depth, then write one
spec per identified component to `components/<tier>/<name>.md`, using the template
and section guidance in `references/component-spec.md`. Every spec references
design-system tokens by name (not raw values) and ties anatomy/states to them.
Apply the never-invent rule: ask or use the `⚠️ Needs input` placeholder for any
section the source does not support. Adapt the template per tier (layout/composite
components document a "Composed of" list; atoms document related/paired atoms).

### Phase 7 — Fidelity verification

Mandatory before presenting. Re-sample the source and confirm the written specs
match it — this catches the assumption-driven defects (inverted surfaces, lost
geometry, misused accent) that pass token validation but contradict the source.

For each layout component and each key atomic state, RE-SAMPLE the corresponding
region/element in the source image (`${CLAUDE_SKILL_DIR}/scripts/sample_colors.py --regions` /
`--points`) and check:

- Surface/elevation order matches the spec and the recorded foundations order?
- Large-region / panel corner radii captured (with a token)?
- Divider/border ownership + edge correct per region?
- Every accent use is within the accent-discipline rule?
- Every state's color AND form match a re-sample (not a "typical" pattern)?

Fix any mismatch and re-run the checklist; loop until it is clean. Record residual
uncertainties as `> ⚠️ Needs input: <what's missing>`, never as silent guesses.

## Presenting results

Use `present_files` with `design-tokens.yaml` first, then `foundations.md`,
`tokens.css`, `components/inventory.md`, and the specs. Keep the message short:
what you extracted, the tiered component count, and any assumptions or unresolved
values to confirm. Then offer the natural next step (see Related skills).

## Reference files

- `references/design-system-foundations.md` — completeness map: the aspects a
  full system describes (principles, three-tier tokens, visual-foundations
  checklist, theming, components, consistency rules, accessibility). **Skim before
  phase 1.**
- `references/dtcg-token-format.md` — DTCG 2025.10 YAML schema: token shape,
  types, sRGB color object, composites, aliasing. **Read before phase 1.**
- `references/component-patterns.md` — detection catalog (cues, anatomy, states,
  tokens, a11y) + the visual-consistency checklist. **Read before phases 4 and 7.**
- `references/component-spec.md` — the three-tier taxonomy and the per-component
  spec template + section guidance (the shared canon also consumed by
  **create-component**). **Read before phases 4 and 6.**

## Scripts

Plain Python (stdlib + `pyyaml`, `Pillow`, `numpy`). Install if missing:
`pip install pyyaml pillow numpy --break-system-packages`.

- `${CLAUDE_SKILL_DIR}/scripts/sample_colors.py IMAGE [--k N] [--points x,y …] [--regions name=x,y,w,h …] [--json]`
  — k-means palette / exact color sampling for **image** sources; `--regions`
  ranks named region backgrounds by luminance to derive the measured
  surface/elevation order (Phases 1 and 7). (For URL sources read colors from CSS
  via `web_fetch` instead.)
- `${CLAUDE_SKILL_DIR}/scripts/validate_tokens.py TOKENS.yaml` — DTCG conformance + alias resolution.

`tokens.css` is written by hand from the validated tokens (Phase 3) — there is no
framework generator in L1. Deterministic per-target generators live downstream in
**adapt-target**.

## Related skills

This skill is L1 — the framework-agnostic core. Everything framework- or
preview-specific lives downstream; mention the relevant next step when you finish
(reference by name; load on demand).

- **adapt-target** — adapts this agnostic system to **one** chosen target
  (`pure-css` / `tailwind` / `react-shadcn` / `react-mui` / `flutter`),
  generating the per-target theme artifact and component mapping. The natural
  next step *after* the system is documented.
- **web-preview** — renders live HTML preview pages for the web targets once
  adapt-target has produced a target.
- **create-component** — interactive authoring of a **net-new** component
  directly into this L1 system (reuses the canonical `component-spec.md`); use it
  when a component is missing rather than extracted from a source.
