---
name: adapt-target
description: Use when a framework-agnostic design system already exists on disk (default .superui/layout/design-system/, produced by extract-design-system or create-component) and the user wants to adapt it to ONE concrete UI target. Triggers: "adapt the design system to <target>", "generate the Tailwind theme", "make a shadcn globals.css from the tokens", "create an MUI theme from the design system", "turn this into a Flutter ThemeData", "wire the tokens into pure CSS / SSR", or a target name (pure-css / tailwind / react-shadcn / react-mui / flutter). Reads the L1 agnostic system (design-tokens.yaml + tokens.css + components/inventory.md + specs), the user picks ONE target, then writes targets/<target>/{target.md, <theme-artifact>, components.md} under the design-system root. Per-target theme artifact: theme.css | globals.css | theme.ts | theme.dart | styles.css. Never invents components absent from the L1 inventory. Hand-authored files are updated incrementally; script-generated theme artifacts are regenerated in full on each run. Distinct from extract-design-system (authors the agnostic system) and web-preview (renders HTML previews of a chosen target).
allowed-tools: Bash(sh:*) Bash(python:*) Bash(python3:*) Bash(py:*)
---

# Per-target Design System Adapter

Take the framework-agnostic design system that L1 (`superui:extract-design-system`)
produced and adapt it to exactly one concrete UI target. This is the L2 layer:
all framework knowledge lives here, backed by per-target references composed
from current official docs. L1 stays neutral; this skill produces the
target-specific theme artifact + a component mapping, written under
`targets/<target>/` so the same neutral system can serve hand-written HTML/SSR,
Tailwind, React component libraries, and Flutter.

## Python preflight

!`sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs this skill's Python check at load. If it reads `PYTHON_MISSING`,
tell the user this skill's `*.py` steps need Python 3 (install it; on Windows make
sure `python` or `py` is on `PATH`) and stop before any `python ...` step. If it reads
`PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in any `python ...` command this
skill runs (the Step 2 converter commands for the `tailwind` / `react-shadcn` targets).

## Operating principles

These shape every step.

- **The L1 system is the source of truth.** Read tokens, foundations, the
  component inventory, and each spec from `.superui/layout/design-system/`; never
  re-derive values from a source image or a URL — that is L1's job. This skill
  maps the existing neutral system onto a target, it does not re-extract.
- **Never invent a component absent from the L1 inventory.** `components.md`
  documents only components present in `components/inventory.md` (+ their specs).
  If a target's idiom needs a block the inventory lacks, either compose it from
  the documented primitives (and say so) or write
  `> NEEDS INPUT: <what's missing>` — never fabricate a spec or a library
  component that the system never described.
- **Adapt one target at a time.** A run targets a single platform. To support a
  second target, run again and pick it — each writes its own
  `targets/<target>/` directory; nothing in one target's directory is shared
  with another.
- **Incremental for hand-authored files, full regeneration for script output.**
  Re-running for the same target touches only the deltas in the files you write
  by hand (`target.md`, `components.md`, the hand-authored theme artifacts) and
  never clobbers hand edits there. The script-generated theme artifacts
  (`theme.css`, `globals.css`) are the opposite: the converter regenerates them
  IN FULL on every run, so never hand-edit them — manual target adjustments
  belong in `target.md` / `components.md`, or in the L1 tokens themselves.
  Same L1 input → same output.
- **Ask when ambiguous, never assume.** If the L1 system is missing a value a
  target requires (e.g. a dark palette, a seed color for Flutter), ask or carry
  the `> NEEDS INPUT:` marker forward — do not guess.

## Inputs — the L1 agnostic system

Read these from `.superui/layout/design-system/` (default; the user may point at
another root):

- `design-tokens.yaml` — the DTCG tokens (primitive + semantic), including the
  canonical dark values (`$extensions.org.superui.dark`). The structured source
  the deterministic converter reads; `theme.css` and `globals.css` derive from it.
- `tokens.css` — the neutral theming artifact: semantic token names as `:root`
  (light) + `.dark` (dark) CSS custom properties. The source the hand-authored
  theme artifacts (`pure-css` / `react-mui` / `flutter`) are derived from.
- `foundations.md` — principles, token tiers, visual foundations (universal vs
  web-only), theming, consistency rules, a11y — the rules every target must honor.
- `components/inventory.md` — the tiered catalog (layout → composite → atomic);
  the complete list of components allowed in `components.md`.
- `components/<tier>/<name>.md` — the per-component spec (anatomy, variants,
  states, tokens, a11y) — the WHAT each `components.md` entry maps onto a
  target's HOW.

## Targets and their theme artifacts

The user picks one. Each target produces exactly one theme artifact (plus
`target.md` + `components.md`):

- `pure-css` → `styles.css` (reference: `references/pure-css.md`) — `tokens.css`
  re-expressed as a utility/class layer + per-component HTML patterns for SSR;
  no framework, no build.
- `tailwind` → `theme.css` (reference: `references/tailwind.md`) — Tailwind v4
  CSS-first `@theme` block; generated by the converter (Step 2).
- `react-shadcn` → `globals.css` (reference: `references/shadcn.md`, layers on
  `tailwind.md`) — shadcn `:root`/`.dark` + `@theme inline`; generated by the
  converter with `--shadcn` (Step 2).
- `react-mui` → `theme.ts` (reference: `references/mui.md`) — MUI
  `createTheme({ palette, typography, spacing, shape, ... })`; reference-guided.
- `flutter` → `theme.dart` (reference: `references/flutter.md`) — Flutter
  `ThemeData` + `ColorScheme.fromSeed` / explicit `ColorScheme` + `TextTheme`;
  reference-guided.

> **Generation strategy.** `tailwind` and `react-shadcn` have a deterministic
> generator (Step 2). The other three theme artifacts (`pure-css`, `react-mui`,
> `flutter`) and **all** `components.md` files are reference-guided — you write
> them by hand from the matching `references/<target>.md`, mapping the L1
> tokens/specs by name. Deterministic generators for those are deliberately
> deferred.

## Dark mode

- The canonical (and only) dark source in the L1 YAML is
  `$extensions.org.superui.dark` on a token — same shape as its `$value`,
  aliases allowed; written by `superui:extract-design-system`. The converter
  reads it and emits the dark blocks for `tailwind` / `react-shadcn`. It never
  invents dark values.
- For the hand-authored targets (`pure-css` / `react-mui` / `flutter`), port the
  dark values from the L1 `tokens.css` `.dark` block as the target reference
  describes. Carry dark only if the L1 system has it; never fabricate a dark
  palette.

## Outputs — the per-target contract

Write under `.superui/layout/design-system/targets/<target>/`:

- `target.md` — the target manifest: which target, the theme-artifact filename,
  the install/import line(s), any `NEEDS INPUT` items carried forward, which L1
  inventory components were mapped, and (if needed) any purely target-specific
  mapping notes that must not leak into L1. The downstream readers
  (`superui:web-preview`, `superui:design-guardian`) resolve the active target
  from here.
- `<theme-artifact>` — the target's theme file (one of the five above).
  `theme.css` / `globals.css` derive from `design-tokens.yaml` via the
  converter; the rest are hand-authored from `tokens.css`.
- `components.md` — the component mapping — see "The `components.md` rule" below.

## Workflow

### Step 0 — Read the L1 system

Read `tokens.css`, `foundations.md`, and `components/inventory.md`. Skim the
specs you will map. If the design-system root is missing or has no `tokens.css`,
stop and tell the user to run `superui:extract-design-system` first — this skill
adapts an existing system, it does not create one.

### Step 1 — Pick the target

The user names one of `pure-css` / `tailwind` / `react-shadcn` / `react-mui` /
`flutter`. If unstated, ask. Then `Read` the matching `references/<target>.md`
(for `react-shadcn`, read **both** `shadcn.md` and the `tailwind.md` it layers
on). Do not read the references for targets you are not building.

### Step 2 — Produce the theme artifact

- `tailwind` → run
  `python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_tailwind.py" design-tokens.yaml -o targets/tailwind/theme.css`
- `react-shadcn` → run
  `python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_tailwind.py" design-tokens.yaml --shadcn -o targets/react-shadcn/globals.css`
- Both commands regenerate the artifact in full (see Operating principles) and
  are deterministic. Optional flags: `--color-format oklch|hex` (literal-color
  format, both modes; default oklch with `--shadcn`, hex otherwise) and
  `--theme-only` (omit the `@import "tailwindcss";` line). Relay the script's
  stderr collision warnings, if any, to the user.
- `pure-css` / `react-mui` / `flutter` → author the artifact by hand from
  `tokens.css`, following the mapping in `references/<target>.md`. Map each
  semantic token by **name** (do not restate raw values that already live in
  the L1 tokens). Carry `.dark` overrides only if the L1 system has them.

### Step 3 — Write `components.md`

Apply the `components.md` rule below: for every component in
`components/inventory.md`, map its L1 spec onto the target's library/idiom.

### Step 4 — Write `target.md`

Record the target, the theme-artifact filename, the install/import line(s) from
`references/<target>.md`, every `NEEDS INPUT` item you carried forward, and the
list of inventory components that were mapped (so re-runs know what already
exists).

### Step 5 — Incremental re-adapt

On a re-run for the same target: read the existing `target.md` to see what is
already mapped, then touch only the deltas (a new inventory component, a retuned
token) in the hand-authored files — leave unrelated entries and hand edits
intact. For `tailwind` / `react-shadcn`, re-run the Step 2 converter instead:
it regenerates `theme.css` / `globals.css` in full from the current L1 tokens.

## The `components.md` rule

> **`components.md` = L1-spec (WHAT) × library-docs (HOW / WHERE).**

For each component the L1 inventory lists, produce one entry combining:

- **WHAT** — from the L1 spec (`components/<tier>/<name>.md`): the anatomy,
  variants, states, the tokens it consumes, and the a11y notes. This is the
  contract; it does not change per target.
- **HOW / WHERE** — from `references/<target>.md`: which library component (or
  composed primitives, or hand-written HTML pattern) realizes that contract on
  this target, plus that target's install/import guidance. Each reference
  documents its own install/import idiom — take it from there, do not improvise.

**Gap policy** (mirrors the L1 never-invent rule):
- If the target library has no component for an L1 entry → compose it from the
  documented primitives and state the composition explicitly.
- If neither a library component nor a clean primitive composition exists →
  write `> NEEDS INPUT: <what's missing>` and carry it into `target.md`.
- **Never** add a `components.md` entry for a component absent from
  `components/inventory.md`, and never invent a library component the docs do
  not describe.

## Reference files

Each per-target reference is composed from the **latest official documentation**
(WebFetch/WebSearch) and carries source citations — never write or update one
from memory. Read only the one(s) for the chosen target. References are read
with `Read`, so `${...}` placeholders do not substitute there — the converter
commands live only in Step 2 of this file; the references point back to it.

- `references/tailwind.md` — DTCG → Tailwind v4 CSS-first `@theme` mapping; the
  exact behavior of the deterministic converter. **Read for `tailwind`.**
- `references/shadcn.md` — shadcn/ui compatibility mode; **layers on
  `tailwind.md`**. Semantic `:root`/`.dark` + `@theme inline`, `npx shadcn add`.
  **Read for `react-shadcn` (together with `tailwind.md`).**
- `references/mui.md` — MUI `createTheme` mapping (palette/typography/spacing/
  shape), `sx`, component imports. **Read for `react-mui`.**
- `references/flutter.md` — Flutter/Material 3 tokens → `ThemeData` /
  `ColorScheme` / `TextTheme`; Material/Cupertino widget mapping. **Read for
  `flutter`.**
- `references/pure-css.md` — `tokens.css` → utility/class layer + per-component
  HTML patterns for SSR. **Read for `pure-css`.**

## Scripts

Plain Python (stdlib + `pyyaml`). Install if missing:
`pip install pyyaml --break-system-packages`.

- `scripts/tokens_to_tailwind.py TOKENS.yaml [-o OUT] [--shadcn] [--theme-only]
  [--color-format oklch|hex]` — deterministic DTCG → Tailwind v4 `@theme`
  stylesheet; `--shadcn` emits the shadcn `:root`/`.dark` + `@theme inline`
  idiom. Dark overrides come only from `$extensions.org.superui.dark`; name
  collisions are warned on stderr + flagged in an output comment; tokens it
  cannot map are listed in trailing comments. Run it via the Step 2 commands
  (the full invocation lives there). The only deterministic per-target
  generator; the other theme artifacts are reference-guided.

## Related skills

- **superui:extract-design-system** — the L1 core that produces the agnostic
  system this skill reads. Run it (or `superui:create-component`) first.
- **superui:create-component** — authors a net-new component into the L1 system;
  re-run this skill afterward to map the new component into a target.
- **superui:web-preview** — renders live HTML preview pages from a chosen
  target's `targets/<target>/` (web targets only: `pure-css`, `tailwind`,
  `react-shadcn`). The natural next step after a web target is adapted.
- **superui:design-guardian** — binds UI implementation to the active
  `targets/<chosen>/` contract during coding.
