# superui - the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skills / agents as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components). It ships four skills - `pro-designer` (the cross-cutting UI/UX standards advisor), `setup` (the
user-only environment diagnostic), and `design-extractor` + its fork worker `design-extractor-builder` (the
screenshots-to-handoff-bundle pipeline) - plus the six agents `design-extractor` dispatches through its
builder: `source-scout`, `foundation-analyst`, `component-scout`, `spec-writer`, `design-synthesizer`,
`bundle-reviewer`.

It is a **single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group) and
are flat-named. The **per-component** catalog of record is `.claude-plugin/plugin.json` `skills[]` +
`agents[]`. It ships **no hooks and no manifest** - `pro-designer` is the only skill reached purely through its
CSO `description:`; `setup` and `design-extractor` are user-only (`disable-model-invocation: true`,
`/superui:setup` and `/superui:design-extractor <screenshots-dir>`); `design-extractor-builder` is internal
(`user-invocable: false`, `context: fork`), reachable only via the `Skill` tool from `design-extractor` itself.

## The handoff bundle

The pipeline produces a lean, one-shot **seed bundle** Claude Design consumes to build live, inline-styled
Design Components - never a self-contained design system, and never persisted by the consumer (Claude Design
re-authors inline styles each turn). Consequences that shape the pipeline skills:

- `DESIGN.md` is the **single source of values on input** - a lean seed loosely conforming to the
  google-labs-code/design.md standard: YAML front matter FIRST (DTCG-shaped light-value tokens - `colors`,
  `typography`, `spacing`, `rounded`, foundations only) then a prose body under the fixed standard headings
  (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Motion, Components, Do's and
  Don'ts). Rich detail beyond the coarse front-matter token model (semantic roles, surface/elevation order,
  accent-usage inventory, borders, shadows, motion, dark-mode coverage) and provenance (`measured|proposed`)
  live in the body only, never as front-matter tokens. No token file ships alongside it.
- **DTCG dropped; front-matter YAML tokens subsume it.** There is no separate DTCG file on input or output -
  the readable front-matter maps are the token surface (readable MD over JSON). A second, competing token
  format would only create a rival source of truth.
- **No doc site.** The consumer renders live inline-styled components - a generated CSS/JS documentation site
  duplicates that and breaks click-to-edit.
- Bundle shape: `DESIGN.md` + `DESIGN.components.md` (all component specs, one `## <slug>` subsection each) +
  `DESIGN.patterns.md` (all pattern specs) + `screens/<file>.png`. Markdown + PNG only - no consumer-side
  Node, npm, or build step to read it. `inventory.md` and `intake-answers.md` stay at `<run>` as internal
  intermediates/provenance; there is no `meta.yml` and no `handoff.zip` (the `<out>/` folder is the
  deliverable). CRITICAL for the renderer: every front-matter value that starts with `#` or holds a `:` is
  quoted (`key: #fff` is a YAML comment) - the emitter double-quotes every string scalar.
- Invariants held throughout: **measure, never guess - every MEASURED value traces to a pixel sample or a
  stated in-image reference**; luminance-ranked surface order; accent-usage inventory; ruthless component
  dedup. The one sanctioned non-measured value is a **PROPOSED** one: when measurement cannot supply a token,
  the `design-synthesizer` may fill it (and round the system out to best practice) with a value carrying
  `proposed: true` + a `rationale` and no evidence - always rendered with a `Source: proposed` marker so an
  invented value is never mistaken for a measured one. Measured and proposed provenance are mutually exclusive
  per token.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest - skills[] + agents[] is the catalog of record
                     (no hooks/ - superui ships no hooks and no injected manifest)
  agents/            The six design-extractor-builder workers, flat-named, each single-purpose
                     (measuring: source-scout, foundation-analyst, spec-writer; judgment:
                     component-scout, design-synthesizer, bundle-reviewer) - addressed via the
                     `Agent` tool by name
  scripts/           Plugin-root deterministic scripts, shared across skills - TypeScript (*.ts) run
                     directly by Node's native type stripping, `node:` builtins only, no npm deps and no
                     build step (plus check_node.sh - the Node env-check, run as an explicit early step
                     by each skill with a script step, no `!` preflight)
  skills/            Flat-named skills (single-domain plugin); shared scripts live at the plugin root
                     (scripts/, addressed via `${CLAUDE_PLUGIN_ROOT}/...`).
                     pro-designer bundles references/ only (its contrast script lives at the plugin-root
                     scripts/); setup bundles only its own scripts/check_env.sh (a diagnostic, never merged
                     into the plugin-root scripts/ since no other skill calls it); design-extractor and
                     design-extractor-builder bundle nothing beyond their own SKILL.md - every deterministic
                     step they run lives at the plugin-root scripts/, every worker they dispatch lives at the
                     plugin-root agents/
```

There is no `references/` or `assets/` dir at present - only `pro-designer` needs a `references/` dir, and it
keeps its own rather than sharing one at the plugin root.

## Skills (flat-named, single domain)

- `pro-designer` - the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type ramps, 4/8pt
  spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with
  hard anti-dark-pattern rules. Fires when creating, styling, or reviewing ANY interface. Bundles
  `references/` only - its contrast gate is the plugin-root `scripts/check_contrast.ts` (WCAG AA), addressed
  via `${CLAUDE_PLUGIN_ROOT}/...`; a missing interpreter is a skip-with-note pointing at `/superui:setup`,
  never a hard stop. Advisory only.
- `setup` - user-only (`disable-model-invocation: true`) environment diagnostic, `/superui:setup`. Runs its
  own bundled `scripts/check_env.sh`, which reports the Node runtime (via the plugin-root `check_node.sh`)
  as PASS/FAIL lines with install hints - no third-party modules to check, the scripts run on Node alone. Never
  installs anything, never edits project files - diagnostic only. Every other skill's env-check step and
  pro-designer's contrast-script fallback point here on a missing interpreter/module.
- `design-extractor` - user-only (`disable-model-invocation: true`) head skill, `/superui:design-extractor
  <screenshots-dir>`. Resolves the input, asks the user any ambiguity questions via `AskUserQuestion` (the
  one call surface that only runs in the main context), transcribes the answers to
  `<run>/intake-answers.md` - the single file it writes itself - then dispatches
  `design-extractor-builder` for everything else and gates on its result. Measures nothing and authors no
  measured or generated artifact inline.
- `design-extractor-builder` - internal fork worker (`user-invocable: false`, `context: fork`), reached only
  via the `Skill` tool from `design-extractor`. The mechanical tail: fans out to the agents below and
  the plugin-root scripts to turn a resolved source dir + source map + inventory into the finished seed
  bundle (`DESIGN.md`, `DESIGN.components.md`, `DESIGN.patterns.md`, `screens/<file>.png`). Each spec-writer
  writes an internal `<run>/specs/{components,patterns}/<slug>.md`; `assemble_specs.ts` consolidates each kind
  into its satellite. Zero user conversation, zero inline design judgment - composes, dispatches, and gates on
  scripted validation.

## Agents (design-extractor-builder workers)

- `source-scout` - maps the screenshots dir into a source map (screen roles, dedup hints); measures nothing.
- `foundation-analyst` - measures ONE foundation per invocation (colors, typography, dimensions, or
  effects-motion) via the plugin-root `sample_colors.ts` / `measure_geometry.ts`, writing a
  `notes-<foundation>.json` fragment; fanned out once per foundation for parallelism.
- `component-scout` - builds the deduplicated component/pattern inventory from the source map.
- `spec-writer` - writes ONE inventory entry's internal `<run>/specs/components/<slug>.md` or
  `<run>/specs/patterns/<slug>.md` from the merged registry plus the source screens; fanned out once per entry.
  `assemble_specs.ts` later consolidates these into the two shipped satellites.
- `design-synthesizer` - fills the registry's `unknowns` and rounds the system out to best practice with
  PROPOSED tokens/textStyles (`proposed: true` + `rationale`, no evidence), writing one
  `foundation:"proposed"` fragment plus a `resolved` list of the unknowns it covered; grounds every proposal
  in the preloaded `pro-designer` skill (`skills:` frontmatter). Runs once, after measurement and
  missing-token resolution. Never measures, never edits a measured value.
- `bundle-reviewer` - judgment-only reviewer over the finished bundle (accent discipline, dedup correctness,
  state-form completeness, surface-order coherence); never measures, never edits.

## Architecture invariants (superui-specific)

- **No hooks, no manifest.** Unlike superdev, superui ships no `hooks/` at all - neither a `SessionStart`
  manifest injection nor a `PreToolUse` plan gate. `pro-designer` is reached purely through its CSO
  `description:`; `setup` and `design-extractor` are user-only commands; `design-extractor-builder` is an
  internal fork reached only via the `Skill` tool. Do not reintroduce a dispatcher manifest unless routing
  genuinely stops working through descriptions alone.
- **Orchestrator does no worker work.** An orchestrator SKILL.md is a checklist plus gates; screenshots are
  read and artifacts authored ONLY by its agents, and deterministic steps are scripts the orchestrator runs.
  `design-extractor` and `design-extractor-builder` hold to this: the head skill's one exception is writing
  the user's own intake answers, since `AskUserQuestion` runs only in the main context.
- **Single writer per file.** Each artifact has exactly one producer per run. Never two agents into one file.
- **Scripts are trusted by their caller.** A self-verifying script carries its I/O contract in its header
  comment; the caller does not re-verify or retry its result.

## Scripts inventory

All `*.ts` scripts are plain ESM TypeScript with erasable syntax only, run directly by Node's native type
stripping (`node <script>.ts`; the `check_node.sh`-resolved command adds `--experimental-strip-types` on
22.6–23.5) - `node:` builtins only, no npm dependencies, no build step. Each script is standalone; the only
relative imports are `sample_colors.ts` -> `vendor/` and `measure_geometry.ts` -> `vendor/`.

- `scripts/check_node.sh` - the Node.js env-check; run as an explicit early step (`sh
  "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`) by every skill with a script step - no `!` preflight.
  Emits `NODE_OK <cmd>` (`node`, or `node --experimental-strip-types` on 22.6 <= v < 23.6) or
  `NODE_MISSING` (absent / < 22.6) -> that skill stops the script-dependent parts and points the user at
  `/superui:setup`.
- `scripts/sample_colors.ts` - k-means palette / exact pixel sampling; `--regions` ranks named region
  backgrounds by luminance (the measured surface/elevation order). The color half of the
  "measure, never guess" invariant.
- `scripts/measure_geometry.ts` - pixel-geometry sampler covering what color sampling does not: paddings,
  gaps, border widths, control heights, corner radii, shadow extents, ink/cap-height bounds. Four independent
  measurement modes selected per invocation (`--edges`, plus the sibling geometry modes). The geometry half of
  the "measure, never guess" invariant, run by `foundation-analyst`.
- `scripts/build_registry.ts` - merges the per-foundation `notes-<foundation>.json` fragments the
  `foundation-analyst` agents write, plus the `design-synthesizer`'s `foundation:"proposed"` fragment, into
  one `registry.json`, the sole resolution namespace `render_design_md.ts` and `validate_bundle.ts` read
  against. A proposed token carries `proposed: true` + `rationale` (no `evidence`); any `unknowns` entry a
  fragment lists under `resolved` (matched by section + `what`) is dropped from the merged `unknowns`, so a
  filled gap never also renders as `> NEEDS INPUT`. Internal to `.temp/` - never enters the bundle.
- `scripts/render_design_md.ts` - the sole writer of `DESIGN.md`. Reads a merged `registry.json` plus the
  run's `inventory.md` (for the Components overview) and emits the seed: YAML front matter FIRST (quoted,
  DTCG-shaped light tokens - `colors` from 3.1+3.2, `typography` from 3.5 families + textStyles, `spacing`
  from 3.6, `rounded` from 3.7 `radius.*`) then the prose body under the fixed standard headings, the old
  `## 3.N` sections surviving as `###` subsections. Never invents, rounds, or infers a value itself - an entry
  listed in `unknowns` renders as `> NEEDS INPUT: <what> - <reason>`; Overview and Do's-and-Don'ts are
  mechanical only (counts + fixed boilerplate). A `proposed` token/textStyle renders as a real body row with a
  `Source` column (`measured|proposed`) and its `rationale` in `Notes`; the `> Legend` and a `> Note`
  (front-matter defaults vs authoritative body Source columns) sit BELOW the closing front-matter `---`.
  CLI: `render_design_md.ts REGISTRY_JSON INVENTORY_MD OUTPUT_MD [--source <label>]`.
- `scripts/assemble_specs.ts` - consolidates a dir of per-entry intermediate specs into ONE satellite
  (`assemble_specs.ts SPECS_DIR OUTPUT_MD`, run once per kind). Each `<slug>.md` is wrapped under a `## <slug>`
  heading derived from the FILENAME (body `## ` headings demoted to `### ` so the slug wrappers stay the only
  h2); an empty dir yields a titled "None catalogued." stub, exit 0. The sole writer of its satellite.
- `scripts/validate_bundle.ts` - validates a finished seed bundle (`DESIGN.md` + the two satellites
  `DESIGN.components.md` / `DESIGN.patterns.md` + `screens/`) against `registry.json` and its own internal
  cross-references: token citations (backtick dotted refs in the satellites), CANONICAL screen citations (every
  satellite `canonical:` line, `matchAll`), the fixed standard headings present + non-empty in `DESIGN.md`, and
  no forbidden `css/js/html/json` artifact. Never mutates the bundle.
- `scripts/check_contrast.ts` - WCAG AA contrast gate (pro-designer).
- `scripts/vendor/png-decode.ts` - from-scratch PNG decoder on `node:zlib` (color types 0/2/3/4/6, bit
  depths 1–16, all filters; interlaced -> clear unsupported error). `scripts/vendor/jpeg-decode.ts` - the
  vendored jpeg-js decoder (MIT, attribution + source commit in its header). Consumed by `sample_colors.ts`
  and `measure_geometry.ts`.
- `skills/setup/scripts/check_env.sh` - diagnostic-only, always exits 0; reports `NODE <cmd>|MISSING` (via
  `check_node.sh`) plus a `VERSION <v>` line whenever node exists. Not shared by any other skill - stays
  under `setup`, not the plugin root.
