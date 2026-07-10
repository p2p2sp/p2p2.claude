---
name: extract-design-system
description: Use when the user provides a folder of UI screenshots or a website URL and wants to reverse-engineer a framework-agnostic design system from it. Triggers: "extract a design system", "build design tokens from these screens", "document the components in this UI", "turn this site into a design system", "reverse-engineer this UI/website", a filesystem path to a screenshots directory, or a URL to take inspiration from. Source-only: produces DTCG design tokens (YAML), a foundations document, a pure-CSS tokens.css (no framework coupling), and a tiered component catalog — layout, composite, and atomic — each with a detailed spec covering variants, states, anatomy, Figma properties, usage rules, and accessibility. Does not target any UI framework or build HTML mockups; per-target adaptation is the separate superui:adapt-target skill, web preview is superui:web-preview.
allowed-tools: Bash(sh:*) Bash(python:*) Bash(python3:*) Bash(py:*) Bash(curl:*)
---

# System Design Extractor

Turn a source UI — a folder of screenshots or a website URL — into a detailed,
self-contained, **framework-agnostic design system**: DTCG design tokens, a
foundations document, a pure-CSS `tokens.css`, and a **tiered catalog of
components**, each documented with a full spec. This is the L1 core: it
reverse-engineers the source into one neutral system.

Input contract: the source (a screenshots-directory path or a website URL)
comes from the invocation prompt or arguments. If none is present, ask for it
before starting.

## Python preflight

!`sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs this skill's Python check at load. If it reads `PYTHON_MISSING`,
tell the user this skill's `*.py` steps need **Python 3** (install it; on Windows make
sure `python` or `py` is on `PATH`) and **stop before any `python …` step**. If it reads
`PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in every `python …` command below.

## Operating principles

These shape every step.

- **Measure, do not guess.** Token and spec values come from the source — pixels
  (images) or CSS (URL) — not from memory of "typical" systems. If a value
  cannot be determined, record `null` with a `$description` saying why; in a spec
  write `> NEEDS INPUT: <what's missing>`. Never fabricate.
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
  (`pure-css` / `tailwind` / `react-shadcn` / `react-mui` / `flutter`) is
  **superui:adapt-target**; building live HTML previews is **superui:web-preview**.
  Offer the next step (see Related skills) — do not bake framework knowledge here.

## Source intake — directory or URL

The user supplies one of two source types. Detect which and read it fully before
extracting.

- **Screenshots directory** (a user-provided path — typically a project
  assets folder): `Read` the directory listing, then `Read` every image so you
  actually see it. Run
  `python "${CLAUDE_SKILL_DIR}/scripts/sample_colors.py" <image>` per image to
  read exact colors. Estimate spacing and sizes against a known reference in the
  image (a 16 px body line, a 40 px avatar), not round numbers.
- **Website URL** (a page to take inspiration from): prefer the **raw sources** —
  download the page and its stylesheets, then `Read` the files, so values come
  from the actual CSS text:

  ```bash
  curl -sL --create-dirs -o .temp/extract-design-system/page.html <url>
  ```

  Find the linked stylesheets in the HTML (`<link rel="stylesheet">`, `@import`)
  and `curl` each one the same way, then `Read` them and take **exact values from
  the raw CSS**: custom properties (`--*`), `color`, `font-*`, spacing,
  `border-radius`, `box-shadow`, breakpoints. If `curl` is unavailable or the
  fetch is blocked, fall back to the `WebFetch` tool — but note that WebFetch
  returns processed (markdown-converted) content, so treat values it reports as
  approximate and confirm any load-bearing value against a raw stylesheet when
  possible. If you also need to see layout/components and a screenshot tool is
  available, capture and `Read` the screenshot; otherwise infer structure from
  the DOM and CSS.

Note the target viewport(s) (desktop ~1280–1440, tablet, mobile) so measurements
are consistent.

## Outputs

Write everything under `.superui/layout/design-system/` (default; the user may override):

- `design-tokens.yaml` — DTCG tokens: primitive + semantic (+ sparse component),
  serialized as YAML; dark-mode values ride `$extensions.org.superui.dark` (Phase 1).
- `foundations.md` — the extracted foundations: principles, token tiers, visual
  foundations, theming, consistency rules, accessibility.
- `tokens.css` — pure-CSS custom properties generated from the validated tokens
  by `scripts/tokens_to_css.py`: `:root` (light) + `.dark` (overrides); no
  framework, no build step.
- `components/inventory.md` — the tiered component catalog (layout → composite →
  atomic); the list shown to the user.
- `components/<tier>/<name>.md` — one detailed spec per identified component.

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
composites, aliasing, the dark-mode extension). Skim
`references/design-system-foundations.md` §3 for the full foundations coverage
checklist so no category is missed. Start from `assets/tokens.template.yaml`:
copy its skeleton and replace every value with a measured one. Its semantic
vocabulary — `color.surface.base/raised/muted/overlay`,
`color.text.primary/secondary/on-accent`, `color.border.default`,
`color.accent.*`, `color.focus`, `radius.control`, `size.icon` / `size.control` —
is the naming baseline for tokens, `foundations.md`, and every spec.

1. **Colors** — exact palette (sampled pixels or CSS); deduplicate near-identical
   colors into one primitive; build a per-hue ramp where the design clearly has
   one. Cover surfaces, text, borders, brand/accent, states, focus ring, overlay.
   **Surface/elevation order is measured, not assumed:** sample the background of
   every major region (page/canvas, sidebar, content panel, topbar, cards, menus)
   with `python "${CLAUDE_SKILL_DIR}/scripts/sample_colors.py" <image> --regions …`
   and assign `surface.base / raised / muted / overlay` by the printed luminance
   order (darkest = base); record that order in `foundations.md`. Never assign
   surfaces by convention.
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

**Dark mode (canon).** A token whose value differs between light and dark
carries the complete dark replacement in `$extensions`:

```yaml
color:
  surface:
    base:
      $value: "{color.gray.50}"
      $extensions:
        org.superui:
          dark: "{color.gray.900}"
```

- `dark` is a full replacement value — same shape and type as `$value`; aliases
  are allowed.
- A token with no light/dark difference has no such extension.
- This extension is the ONLY source of truth for dark in L1; the `.dark` block
  of `tokens.css` is derived from it (Phase 3). Never fabricate dark values — if
  the source shows no dark screens, add no extensions and tell the user.

Write `design-tokens.yaml`, then validate and fix every error:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/validate_tokens.py" .superui/layout/design-system/design-tokens.yaml
```

**Accent-usage inventory.** Before moving on, enumerate every location the
chromatic accent/highlight color appears in the source (e.g. "accent.500 appears
only on the selected calendar-day ring"). This list becomes the foundations
"accent discipline" rule (Phase 2) and the cross-check baseline (Phase 5).

### Phase 2 — Write the foundations document

Using `references/design-system-foundations.md` as the map, write
`foundations.md`: the observed design principles, the token tiers, the visual
foundations summary, the theming approach (including which tokens carry
`$extensions.org.superui.dark`), the cross-component consistency rules, and the
system-wide accessibility notes. Reference tokens by name; state any assumptions
and unresolved values explicitly.

**Heading contract (guaranteed output).** `foundations.md` MUST contain a
section whose heading is exactly `## 6. Patterns & usage / consistency rules`.
Downstream consumers (superui:design-guardian, superui:design-audit) locate the
consistency rules by that verbatim heading — do not rename, renumber, or merge it.

### Phase 3 — Generate `tokens.css`

`tokens.css` is derived, never authored by hand. Generate it from the validated
tokens:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_css.py" .superui/layout/design-system/design-tokens.yaml .superui/layout/design-system/tokens.css
```

The script emits one flat `--<token-path-with-hyphens>` custom property per
token in `:root` (aliases become `var(--…)`; shadow/border/transition composites
become one usable CSS value; typography/gradient composites become comments —
their parts are already tokens) and builds the `.dark` block from every
`$extensions.org.superui.dark` value. Trust its result — do not re-verify or
hand-edit `tokens.css`; to change it, edit the YAML, re-validate, re-run.

**Theming.** A theme swaps token values behind stable semantic names: `:root`
holds light, `.dark` holds the overrides derived from the extensions. If the
source gave no dark screens, the script leaves a TODO scaffold in `.dark` —
tell the user rather than inventing a palette.

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
(e.g. a focus-ring color, a card radius), add it as a token, re-run the Phase 1
validation, and re-run the Phase 3 generation so `tokens.css` stays derived.
Every distinct visual value a component uses must exist as a token before it is
specced.

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
Apply the never-invent rule: ask, or write the `> NEEDS INPUT: <what's missing>`
placeholder for any section the source does not support. Adapt the template per
tier (layout/composite components document a "Composed of" list; atoms document
related/paired atoms).

### Phase 7 — Fidelity verification

Mandatory before presenting. Re-sample the source and confirm the written specs
match it — this catches the assumption-driven defects (inverted surfaces, lost
geometry, misused accent) that pass token validation but contradict the source.

For each layout component and each key atomic state, RE-SAMPLE the corresponding
region/element in the source image
(`python "${CLAUDE_SKILL_DIR}/scripts/sample_colors.py" <image> --regions …` /
`--points …`) and check:

- Surface/elevation order matches the spec and the recorded foundations order?
- Large-region / panel corner radii captured (with a token)?
- Divider/border ownership + edge correct per region?
- Every accent use is within the accent-discipline rule?
- Every state's color AND form match a re-sample (not a "typical" pattern)?

Fix any mismatch and re-run the checklist; loop until it is clean. Record residual
uncertainties as `> NEEDS INPUT: <what's missing>`, never as silent guesses.

## Presenting results

Give the user the paths of the produced files, `design-tokens.yaml` first, then
`foundations.md`, `tokens.css`, `components/inventory.md`, and the
`components/<tier>/` spec files. Keep the message short: what you extracted, the
tiered component count, and any assumptions or `NEEDS INPUT` items to confirm.
Then offer the natural next step (see Related skills).

## Reference files

- `references/design-system-foundations.md` — completeness map: the aspects a
  full system describes (principles, three-tier tokens, visual-foundations
  checklist, theming, components, consistency rules, accessibility). **Skim before
  phase 1.**
- `references/dtcg-token-format.md` — DTCG 2025.10 YAML schema: token shape,
  types, sRGB color object, composites, aliasing, the
  `$extensions.org.superui.dark` canon. **Read before phase 1.**
- `references/component-patterns.md` — detection catalog (cues, anatomy, states,
  tokens, a11y per common block) + the visual-consistency checklist. **Read before
  phases 4 and 7.**
- `references/component-spec.md` — the three-tier taxonomy and the per-component
  spec template + section guidance (the shared canon also consumed by
  **superui:create-component**). **Read before phases 4 and 6.**

## Scripts

Plain Python (stdlib + `pyyaml`, `Pillow`, `numpy`). Install if missing, using
the interpreter resolved by the preflight:
`<cmd> -m pip install pyyaml pillow numpy --break-system-packages`.

- `python "${CLAUDE_SKILL_DIR}/scripts/sample_colors.py" IMAGE [--k N] [--points x,y …] [--regions name=x,y,w,h …] [--json]`
  — k-means palette / exact color sampling for **image** sources; `--regions`
  ranks named region backgrounds by luminance to derive the measured
  surface/elevation order (Phases 1 and 7). (For URL sources read colors from the
  downloaded CSS instead.)
- `python "${CLAUDE_SKILL_DIR}/scripts/validate_tokens.py" TOKENS.yaml` — DTCG
  conformance + recursive alias resolution, covering composite values and
  `$extensions.org.superui.dark`.
- `python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_css.py" TOKENS.yaml OUTPUT.css`
  — deterministic `design-tokens.yaml` → `tokens.css` generation (Phase 3).

Each script carries its full I/O contract in its header and verifies its own
result — trust its output and error messages; do not re-check or retry.

## Related skills

This skill is L1 — the framework-agnostic core. Everything framework- or
preview-specific lives downstream; mention the relevant next step when you finish
(reference by name; load on demand).

- **superui:adapt-target** — adapts this agnostic system to **one** chosen target
  (`pure-css` / `tailwind` / `react-shadcn` / `react-mui` / `flutter`),
  generating the per-target theme artifact and component mapping. The natural
  next step once the system is documented.
- **superui:web-preview** — renders live HTML preview pages for the web targets
  once superui:adapt-target has produced a target.
- **superui:create-component** — interactive authoring of a **net-new** component
  directly into this L1 system (reuses the canonical `component-spec.md`); use it
  when a component is missing rather than extracted from a source.
