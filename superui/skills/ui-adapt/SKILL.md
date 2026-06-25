---
name: ui-adapt
description: Use when a framework-agnostic design system already exists on disk (default .superui/layout/design-system/, produced by ui-extract-system-design or ui-component-creator) and the user wants to adapt it to ONE concrete UI target. Triggers: "adapt the design system to <target>", "generate the Tailwind theme", "make a shadcn globals.css from the tokens", "create an MUI theme from the design system", "turn this into a Flutter ThemeData", "wire the tokens into pure CSS / SSR", or a target name (pure-css / tailwind / react-shadcn / react-mui / flutter). Reads the L1 agnostic system (tokens.css + components/inventory.md + specs), the user picks ONE target, then writes targets/<target>/{target.md, <theme-artifact>, components.md} under the design-system root. Per-target theme artifact: theme.css | globals.css | _variables.scss | theme.ts | theme.dart | styles.css. Never invents components absent from the L1 inventory. Incremental and idempotent — re-adapt one component, not the whole system. Distinct from ui-extract-system-design (authors the agnostic system) and ui-web-preview (renders HTML previews of a chosen target).
allowed-tools: Bash(sh:*)
---

# Per-target Design System Adapter

Take the **framework-agnostic** design system that L1 (`ui-extract-system-design`) produced and
adapt it to **exactly one** concrete UI target. This is the L2 layer: all
framework knowledge lives here, backed by per-target references composed from
current official docs. L1 stays neutral; this skill produces the target-specific
theme artifact + a component mapping, written under
`targets/<target>/` so the same neutral system can serve hand-written
HTML/SSR, Tailwind, React component libraries, and Flutter.

## Python preflight

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs this skill's Python check at load. If it reads `PYTHON_MISSING`,
tell the user this skill's `*.py` steps need **Python 3** (install it; on Windows make
sure `python` or `py` is on `PATH`) and **stop before any `python …` step**. If it reads
`PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in any `python …` command this skill
runs (e.g. the `tokens_to_tailwind.py` step for the shadcn target, in `references/shadcn.md`).

## Operating principles

These shape every step.

- **The L1 system is the source of truth.** Read tokens, foundations, the
  component inventory, and each spec from `.superui/layout/design-system/`; never
  re-derive values from a source image or a URL — that is L1's job. This skill
  *maps* the existing neutral system onto a target, it does not re-extract.
- **Never invent a component absent from the L1 inventory.** `components.md`
  documents only components present in `components/inventory.md` (+ their specs).
  If a target's idiom needs a block the inventory lacks, either **compose it from
  the documented primitives** (and say so) or write
  `> ⚠️ Needs input: <what's missing>` — never fabricate a spec or a library
  component that the system never described.
- **Adapt one target at a time.** A run targets a single platform. To support a
  second target, run again and pick it — each writes its own
  `targets/<target>/` directory; nothing in one target's directory is shared
  with another.
- **Incremental and idempotent.** Re-running for the same target re-adapts only
  what changed (one new component, one retuned token) — it does not regenerate
  the whole `targets/<target>/` from scratch or clobber hand edits. Same L1
  input → same output.
- **Ask when ambiguous, never assume.** If the L1 system is missing a value a
  target requires (e.g. a dark palette for `globals.css`, a seed color for
  Flutter), ask or carry the `⚠️ Needs input` marker forward — do not guess.

## Inputs — the L1 agnostic system

Read these from `.superui/layout/design-system/` (default; the user may point at
another root):

| Input | What it gives this skill |
|------|------|
| `tokens.css` | The neutral theming artifact — semantic token names as `:root` (light) + `.dark` (dark) CSS custom properties. The single source every target's theme artifact is derived from. |
| `design-tokens.yaml` | The DTCG tokens (primitive + semantic). Read when a deterministic generator needs the structured source (e.g. `tokens_to_tailwind.py`). |
| `foundations.md` | Principles, token tiers, visual foundations (universal vs web-only), theming, consistency rules, a11y — the rules every target must honor. |
| `components/inventory.md` | The tiered catalog (layout → composite → atomic) — the **complete** list of components allowed in `components.md`. |
| `components/<tier>/<name>.md` | The per-component spec (anatomy, variants, states, tokens, a11y) — the WHAT each `components.md` entry maps onto a target's HOW. |

## Targets and their theme artifacts

The user picks **one**. Each target produces exactly one theme artifact filename
(plus `target.md` + `components.md`):

| Target | Theme artifact | Reference | Theme approach |
|------|------|------|------|
| `pure-css` | `styles.css` | `references/pure-css.md` | `tokens.css` re-expressed as a utility/class layer + per-component HTML patterns for SSR; no framework, no build. |
| `tailwind` | `theme.css` | `references/tailwind.md` | Tailwind v4 CSS-first `@theme { … }` block (deterministic via `scripts/tokens_to_tailwind.py`). |
| `react-shadcn` | `globals.css` | `references/shadcn.md` (layers on `tailwind.md`) | shadcn `:root`/`.dark` + `@theme inline` (deterministic via `scripts/tokens_to_tailwind.py --shadcn`). |
| `react-mui` | `theme.ts` | `references/mui.md` | MUI `createTheme({ palette, typography, spacing, shape, … })` (reference-guided). |
| `flutter` | `theme.dart` | `references/flutter.md` | Flutter `ThemeData` + `ColorScheme.fromSeed` / explicit `ColorScheme` + `TextTheme` (reference-guided). |

`_variables.scss` is the artifact name reserved for a future Sass/Bootstrap
target slot (see Out-of-scope); no reference ships for it yet.

> **Generation strategy.** `tailwind` and `react-shadcn` have a deterministic
> generator (`scripts/tokens_to_tailwind.py`). The other three theme artifacts
> (`pure-css`, `react-mui`, `flutter`) and **all** `components.md` files are
> reference-guided for now — you write them by hand from the matching
> `references/<target>.md`, mapping the L1 tokens/specs by name. Deterministic
> generators for those are deliberately deferred.

## Outputs — the per-target contract

Write under `.superui/layout/design-system/targets/<target>/`:

| File | What it is |
|------|------|
| `target.md` | The target manifest: which target, the theme-artifact filename, the install/import line(s), any `⚠️ Needs input` carried forward, and which L1 inventory components were mapped. The downstream readers (`ui-web-preview`, `ui-guardian`) resolve the active target from here. |
| `<theme-artifact>` | The target's theme file (one of the six above), derived from `tokens.css` / `design-tokens.yaml`. |
| `components.md` | The component mapping — see "The `components.md` rule" below. |

## Workflow

### Step 0 — Read the L1 system

Read `tokens.css`, `foundations.md`, and `components/inventory.md`. Skim the
specs you will map. If the design-system root is missing or has no `tokens.css`,
stop and tell the user to run `ui-extract-system-design` first — this skill adapts an existing
system, it does not create one.

### Step 1 — Pick the target

The user names one of `pure-css` / `tailwind` / `react-shadcn` / `react-mui` /
`flutter`. If unstated, ask. Then `Read` the matching `references/<target>.md`
(for `react-shadcn`, read **both** `shadcn.md` and the `tailwind.md` it layers
on). Do not read the references for targets you are not building.

### Step 2 — Produce the theme artifact

- `tailwind` → run `scripts/tokens_to_tailwind.py design-tokens.yaml -o targets/tailwind/theme.css` (deterministic).
- `react-shadcn` → run `scripts/tokens_to_tailwind.py design-tokens.yaml --shadcn -o targets/react-shadcn/globals.css` (deterministic).
- `pure-css` / `react-mui` / `flutter` → author the artifact by hand from
  `tokens.css`, following the mapping table in `references/<target>.md`. Map
  each semantic token by **name** (do not restate raw values that already live
  in the L1 tokens). Carry `.dark` overrides only if the L1 system has them;
  never fabricate a dark palette.

### Step 3 — Write `components.md`

Apply the `components.md` rule below: for every component in
`components/inventory.md`, map its L1 spec onto the target's library/idiom.

### Step 4 — Write `target.md`

Record the target, the theme-artifact filename, the install/import line(s) from
`references/<target>.md`, every `⚠️ Needs input` you carried forward, and the
list of inventory components that were mapped (so re-runs know what already
exists).

### Step 5 — Incremental re-adapt

On a re-run for the same target: read the existing `target.md` to see what is
already mapped, then touch only the deltas (a new inventory component, a retuned
token). Leave unrelated entries and any hand edits intact.

## The `components.md` rule

> **`components.md` = L1-spec (WHAT) × library-docs (HOW / WHERE).**

For each component the L1 inventory lists, produce one entry combining:

- **WHAT** — from the L1 spec (`components/<tier>/<name>.md`): the anatomy,
  variants, states, the tokens it consumes, and the a11y notes. This is the
  contract; it does not change per target.
- **HOW / WHERE** — from `references/<target>.md`: which library component (or
  composed primitives, or hand-written HTML pattern) realizes that contract on
  this target, **plus the install/import guidance**:
  - `react-shadcn` → `npx shadcn add <component>` and the import path.
  - `react-mui` → `import { Button } from '@mui/material'` (+ the `sx`/theme
    hook it reads).
  - `flutter` → the built-in Material/Cupertino widget (no install) and the
    `ThemeData`/`ColorScheme` slots it reads.
  - `tailwind` / `pure-css` → the documented HTML markup pattern + the
    utility/class names that bind to the theme artifact.

**Gap policy** (mirrors the L1 never-invent rule):
- If the target library has no component for an L1 entry → **compose it from the
  documented primitives** and state the composition explicitly.
- If neither a library component nor a clean primitive composition exists →
  write `> ⚠️ Needs input: <what's missing>` and carry it into `target.md`.
- **Never** add a `components.md` entry for a component absent from
  `components/inventory.md`, and never invent a library component the docs do
  not describe.

## Reference files

Each per-target reference is composed from the **latest official documentation**
(WebFetch/WebSearch) and carries source citations — never write or update one
from memory. Read only the one(s) for the chosen target.

- `references/tailwind.md` — DTCG → Tailwind v4 CSS-first `@theme` mapping; the
  namespace map the deterministic generator implements. **Read for `tailwind`.**
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
  idiom. The only deterministic per-target generator; the other theme artifacts
  are reference-guided.

## Related skills

- **ui-extract-system-design** — the L1 core that produces the agnostic system this skill
  reads. Run it (or `ui-component-creator`) first.
- **ui-component-creator** — authors a net-new component into the L1 system;
  re-run this skill afterward to map the new component into a target.
- **ui-web-preview** — renders live HTML preview pages from a chosen target's
  `targets/<target>/` (web targets only: `pure-css`, `tailwind`,
  `react-shadcn`). The natural next step *after* a web target is adapted.
- **ui-guardian** — binds UI implementation to the active `targets/<chosen>/`
  contract during coding.
