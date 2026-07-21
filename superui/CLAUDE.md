# superui — the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / agents as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components). It ships four skills — `pro-designer` (the cross-cutting UI/UX standards advisor), `setup` (the
user-only environment diagnostic), and `design-extractor` + its fork worker `design-extractor-builder` (the
screenshots-to-handoff-bundle pipeline) — plus the six agents `design-extractor` dispatches through its
builder: `source-scout`, `foundation-analyst`, `component-scout`, `spec-writer`, `design-synthesizer`,
`bundle-reviewer`.

It is a **single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group) and
are flat-named. The **per-component** catalog of record is `.claude-plugin/plugin.json` `skills[]` +
`agents[]`. It ships **no hooks and no manifest** — `pro-designer` is the only skill reached purely through its
CSO `description:`; `setup` and `design-extractor` are user-only (`disable-model-invocation: true`,
`/superui:setup` and `/superui:design-extractor <screenshots-dir>`); `design-extractor-builder` is internal
(`user-invocable: false`, `context: fork`), reachable only via the `Skill` tool from `design-extractor` itself.

## The handoff bundle

The pipeline produces a **handoff bundle** that Claude Design consumes to build live, inline-styled Design
Components — never a self-contained design system. Consequences that shape the pipeline skills:

- `design.md` is the **single source of values on input** — exhaustive and self-contained (color primitives,
  semantic roles, luminance-ranked surface/elevation order, accent-usage inventory, type scale, spacing, radii,
  borders, shadows, motion, dark-mode coverage). No token file ships alongside it.
- **DTCG is an OUTPUT, never an input.** It is regenerated from the finished Design Components at the end, as
  the handoff back to Claude Code. Shipping it on input would create a second, competing source of truth.
- **No doc site.** The consumer renders live inline-styled components — a generated CSS/JS documentation site
  duplicates that and breaks click-to-edit.
- Bundle shape: `design.md` + `inventory.md` + `components/<slug>.md` + `patterns/<slug>.md` +
  `screens/<file>.png` + `meta.yml` (machine index) + optional `intake-answers.md`, packed alongside as
  `handoff.zip`. Markdown + PNG + one small index — no consumer-side Node, npm, or build step to read it.
- Invariants held throughout: **measure, never guess — every MEASURED value traces to a pixel sample or a
  stated in-image reference**; luminance-ranked surface order; accent-usage inventory; ruthless component
  dedup. The one sanctioned non-measured value is a **PROPOSED** one: when measurement cannot supply a token,
  the `design-synthesizer` may fill it (and round the system out to best practice) with a value carrying
  `proposed: true` + a `rationale` and no evidence — always rendered with a `Source: proposed` marker so an
  invented value is never mistaken for a measured one. Measured and proposed provenance are mutually exclusive
  per token.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] is the catalog of record
                     (no hooks/ — superui ships no hooks and no injected manifest)
  agents/            The six design-extractor-builder workers, flat-named, each single-purpose
                     (measuring: source-scout, foundation-analyst, spec-writer; judgment:
                     component-scout, design-synthesizer, bundle-reviewer) — addressed via the
                     `Agent` tool by name
  scripts/           Plugin-root deterministic scripts, shared across skills — TypeScript (*.ts) run
                     directly by Node's native type stripping, `node:` builtins only, no npm deps and no
                     build step (plus check_node.sh — the Node env-check, run as an explicit early step
                     by each skill with a script step, no `!` preflight)
  skills/            Flat-named skills (single-domain plugin); shared scripts live at the plugin root
                     (scripts/, addressed via `${CLAUDE_PLUGIN_ROOT}/...`).
                     pro-designer bundles references/ only (its contrast script lives at the plugin-root
                     scripts/); setup bundles only its own scripts/check_env.sh (a diagnostic, never merged
                     into the plugin-root scripts/ since no other skill calls it); design-extractor and
                     design-extractor-builder bundle nothing beyond their own SKILL.md — every deterministic
                     step they run lives at the plugin-root scripts/, every worker they dispatch lives at the
                     plugin-root agents/
```

There is no `references/` or `assets/` dir at present — only `pro-designer` needs a `references/` dir, and it
keeps its own rather than sharing one at the plugin root.

## Skills (flat-named, single domain)

- `pro-designer` — the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type ramps, 4/8pt
  spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with
  hard anti-dark-pattern rules. Fires when creating, styling, or reviewing ANY interface. Bundles
  `references/` only — its contrast gate is the plugin-root `scripts/check_contrast.ts` (WCAG AA), addressed
  via `${CLAUDE_PLUGIN_ROOT}/...`; a missing interpreter is a skip-with-note pointing at `/superui:setup`,
  never a hard stop. Advisory only.
- `setup` — user-only (`disable-model-invocation: true`) environment diagnostic, `/superui:setup`. Runs its
  own bundled `scripts/check_env.sh`, which reports the Node runtime (via the plugin-root `check_node.sh`)
  as PASS/FAIL lines with install hints — no third-party modules to check, the scripts run on Node alone. Never
  installs anything, never edits project files — diagnostic only. Every other skill's env-check step and
  pro-designer's contrast-script fallback point here on a missing interpreter/module.
- `design-extractor` — user-only (`disable-model-invocation: true`) head skill, `/superui:design-extractor
  <screenshots-dir>`. Resolves the input, asks the user any ambiguity questions via `AskUserQuestion` (the
  one call surface that only runs in the main context), transcribes the answers to
  `<run>/intake-answers.md` — the single file it writes itself — then dispatches
  `design-extractor-builder` for everything else and gates on its result. Measures nothing and authors no
  measured or generated artifact inline.
- `design-extractor-builder` — internal fork worker (`user-invocable: false`, `context: fork`), reached only
  via the `Skill` tool from `design-extractor`. The mechanical tail: fans out to the six agents below and
  the plugin-root scripts to turn a resolved source dir + source map + inventory into the finished handoff
  bundle (`design.md`, `inventory.md`, `components/<slug>.md`, `patterns/<slug>.md`, `screens/<file>.png`,
  `meta.yml`, optional `intake-answers.md`) plus a sibling `handoff.zip`. Zero user conversation, zero
  inline design judgment — composes, dispatches, and gates on scripted validation.

## Agents (design-extractor-builder workers)

- `source-scout` — maps the screenshots dir into a source map (screen roles, dedup hints); measures nothing.
- `foundation-analyst` — measures ONE foundation per invocation (colors, typography, dimensions, or
  effects-motion) via the plugin-root `sample_colors.ts` / `measure_geometry.ts`, writing a
  `notes-<foundation>.json` fragment; fanned out once per foundation for parallelism.
- `component-scout` — builds the deduplicated component/pattern inventory from the source map.
- `spec-writer` — writes ONE inventory entry's `components/<slug>.md` or `patterns/<slug>.md` from the merged
  registry plus the source screens; fanned out once per entry.
- `design-synthesizer` — fills the registry's `unknowns` and rounds the system out to best practice with
  PROPOSED tokens/textStyles (`proposed: true` + `rationale`, no evidence), writing one
  `foundation:"proposed"` fragment plus a `resolved` list of the unknowns it covered; grounds every proposal
  in the preloaded `pro-designer` skill (`skills:` frontmatter). Runs once, after measurement and
  missing-token resolution. Never measures, never edits a measured value.
- `bundle-reviewer` — judgment-only reviewer over the finished bundle (accent discipline, dedup correctness,
  state-form completeness, surface-order coherence); never measures, never edits.

## Architecture invariants (superui-specific)

- **No hooks, no manifest.** Unlike superdev, superui ships no `hooks/` at all — neither a `SessionStart`
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
22.6–23.5) — `node:` builtins only, no npm dependencies, no build step. Each script is standalone; the only
relative imports are `sample_colors.ts` -> `vendor/` and `measure_geometry.ts` -> `vendor/`.

- `scripts/check_node.sh` — the Node.js env-check; run as an explicit early step (`sh
  "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`) by every skill with a script step — no `!` preflight.
  Emits `NODE_OK <cmd>` (`node`, or `node --experimental-strip-types` on 22.6 <= v < 23.6) or
  `NODE_MISSING` (absent / < 22.6) -> that skill stops the script-dependent parts and points the user at
  `/superui:setup`.
- `scripts/sample_colors.ts` — k-means palette / exact pixel sampling; `--regions` ranks named region
  backgrounds by luminance (the measured surface/elevation order). The color half of the
  "measure, never guess" invariant.
- `scripts/measure_geometry.ts` — pixel-geometry sampler covering what color sampling does not: paddings,
  gaps, border widths, control heights, corner radii, shadow extents, ink/cap-height bounds. Four independent
  measurement modes selected per invocation (`--edges`, plus the sibling geometry modes). The geometry half of
  the "measure, never guess" invariant, run by `foundation-analyst`.
- `scripts/build_registry.ts` — merges the per-foundation `notes-<foundation>.json` fragments the
  `foundation-analyst` agents write, plus the `design-synthesizer`'s `foundation:"proposed"` fragment, into
  one `registry.json`, the sole resolution namespace `render_design_md.ts` and `validate_bundle.ts` read
  against. A proposed token carries `proposed: true` + `rationale` (no `evidence`); any `unknowns` entry a
  fragment lists under `resolved` (matched by section + `what`) is dropped from the merged `unknowns`, so a
  filled gap never also renders as `> NEEDS INPUT`. Internal to `.temp/` — never enters the bundle.
- `scripts/render_design_md.ts` — pure renderer: turns a merged `registry.json` into `design.md`'s ten fixed
  `## 3.N` sections. Never invents, rounds, or infers a value itself — an entry listed in `unknowns` renders
  as `> NEEDS INPUT: <what> — <reason>`. A `proposed` token/textStyle renders as a real row with a `Source`
  column (`measured|proposed`) and its `rationale` in `Notes`; when any proposed value is present a one-line
  `> Legend` is prepended above section 3.1.
- `scripts/build_meta.ts` — derives `meta.yml`, the bundle's machine index, from the bundle dir's own
  contents, so meta-versus-contents consistency holds by construction.
- `scripts/validate_bundle.ts` — validates a finished bundle against `registry.json` and its own internal
  cross-references (token citations, CANONICAL screen citations, non-empty required sections) before packing;
  never mutates the bundle.
- `scripts/pack_bundle.ts` — packs a validated bundle dir into a sibling `handoff.zip` by hand
  (`node:zlib.deflateRawSync` per entry, local file headers, central directory, CRC32) — no npm dependency.
- `scripts/check_contrast.ts` — WCAG AA contrast gate (pro-designer).
- `scripts/vendor/png-decode.ts` — from-scratch PNG decoder on `node:zlib` (color types 0/2/3/4/6, bit
  depths 1–16, all filters; interlaced -> clear unsupported error). `scripts/vendor/jpeg-decode.ts` — the
  vendored jpeg-js decoder (MIT, attribution + source commit in its header). Consumed by `sample_colors.ts`
  and `measure_geometry.ts`.
- `skills/setup/scripts/check_env.sh` — diagnostic-only, always exits 0; reports `NODE <cmd>|MISSING` (via
  `check_node.sh`) plus a `VERSION <v>` line whenever node exists. Not shared by any other skill — stays
  under `setup`, not the plugin root.
