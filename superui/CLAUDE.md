# superui - the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skills / agents as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components). It ships six skills - `pro-designer` (the cross-cutting UI/UX standards advisor), `setup` (the
user-only environment diagnostic), and a **two-stage** screenshots-to-handoff-bundle pipeline split across two
head/builder pairs: `design-extractor` + `design-extractor-builder` extract the pure, platform-neutral design
system (`DESIGN.md` alone); `component-extractor` + `component-extractor-builder` read that `DESIGN.md` and
build one platform's component/pattern bundle at a time (`web-app` | `mobile` | `website`) - plus seven agents
split across the two builders and the `design-extractor` head: `design-extractor` dispatches `source-scout`;
`design-extractor-builder` dispatches `foundation-analyst` and `design-synthesizer`; `component-extractor`
dispatches `source-scout` again and `component-scout`; `component-extractor-builder` dispatches `spec-writer`,
`component-synthesizer`, and `bundle-reviewer`.

It is a **single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group) and
are flat-named. The **per-component** catalog of record is `.claude-plugin/plugin.json` `skills[]` +
`agents[]`. It ships **no hooks and no manifest** - `pro-designer` is the only skill reached purely through its
CSO `description:`; `setup` and `design-extractor` are user-only (`disable-model-invocation: true`,
`/superui:setup` and `/superui:design-extractor <screenshots-dir> [<target>]`); `component-extractor` is a
deliberate exception to that user-only norm - model-invocable with a guarded CSO `description:` so
`design-extractor`'s own ending loop can chain into it via the `Skill` tool, while a user can also run
`/superui:component-extractor <screenshots-dir> <platform> [<target>]` directly against an existing
`DESIGN.md`; `design-extractor-builder` and `component-extractor-builder` are both internal
(`user-invocable: false`, `context: fork`), each reachable only via the `Skill` tool from its own head skill.

## The handoff bundle

The pipeline produces a lean, **two-layer** seed bundle Claude Design consumes to build live, inline-styled
Design Components - never a self-contained design system, and never persisted by the consumer (Claude Design
re-authors inline styles each turn). Layer one is platform-neutral, layer two is per-platform, and the second
never exists without the first:

- **Layer one - `DESIGN.md`** at the bundle root, produced once by `design-extractor` /
  `design-extractor-builder`. The **single source of values on input** - a lean seed loosely conforming to
  the google-labs-code/design.md standard: YAML front matter FIRST (DTCG-shaped light-value tokens -
  `colors`, `typography`, `spacing`, `rounded`, `shadows` (3.8 `shadow.*`), `gradients` (3.8 `gradient.*`),
  foundations only) then a prose body under the fixed standard headings (Overview, Colors, Typography,
  Layout & Spacing, Elevation & Depth, Shapes, Motion, Components, Do's and Don'ts). The Components heading is
  fixed pointer boilerplate - no inventory, no satellites, no screens described here; that is entirely
  layer two's job, run once per platform against these tokens. Rich detail beyond the coarse front-matter
  token model (semantic roles, surface/elevation order, accent-usage inventory, borders, motion, dark-mode
  coverage) and provenance (`measured|proposed`) live in the body only, never as front-matter tokens. Every
  dimension value is **reference px @1x**; shadows render as neutral offset/blur/color measurement notation,
  never CSS shadow shorthand - a `> Note` below the front matter states both, plus how to map units per
  platform. No token file ships alongside it.
- **Layer two - the platform subdir** at `<platform>/` under the bundle root (`web-app/`, `mobile/`, or
  `website/`), produced once per platform by `component-extractor` / `component-extractor-builder` from that
  root `DESIGN.md`: `DESIGN.components.md` (all component specs, one `## <slug>` subsection each),
  `DESIGN.patterns.md` (all pattern specs), `screens/<file>.png`. A component/pattern missing against the
  platform's expected-components checklist is still covered - `component-scout` lists it under `## Gaps` in
  the inventory, the user reviews the list in `component-extractor`'s inventory loop, and
  `component-synthesizer` invents its spec from `registry.json` tokens only, opening with
  `> NEEDS ATTENTION: invented, not observed` and carrying `canonical: none` in place of a real screen
  reference. A platform bundle can be built, rebuilt, or added for a new platform any number of times against
  the same `DESIGN.md`, independent of the other platforms already present.
- **DTCG dropped; front-matter YAML tokens subsume it.** There is no separate DTCG file on input or output -
  the readable front-matter maps are the token surface (readable MD over JSON). A second, competing token
  format would only create a rival source of truth.
- **No doc site.** The consumer renders live inline-styled components - a generated CSS/JS documentation site
  duplicates that and breaks click-to-edit.
- Bundle shape on disk: Markdown + PNG only - no consumer-side Node, npm, or build step to read it.
  `source-map.md`, `inventory.md` and `intake-answers.md` stay at each stage's own `<run>` as internal
  intermediates/provenance; there is no `meta.yml` and no `handoff.zip` (the `<out>/` folder is the
  deliverable). **`<out>` is `docs/design-system/` in the host repo** - `docs/design-system/<target>/` when
  the user passes the optional `<target>` argument (a monorepo shipping separate bundles per app);
  `component-extractor`'s own `<out>` nests one level deeper, `docs/design-system/[<target>/]<platform>/`. It
  sits alongside the other two host-repo doc layers, `docs/adr/` and `docs/product/`, and unlike `<run>` it is
  a version-controlled deliverable, not scratch. Each layer is always regenerated whole, so a non-empty
  `<out>` gates on an explicit user wipe/abort answer before any write, scoped to that one layer only - a
  `DESIGN.md` rebuild never touches an existing platform subdir (it warns the subdir's satellites are now
  stale against the regenerated tokens), and a platform rebuild never touches `DESIGN.md` or a sibling
  platform subdir. See the design-extractor and component-extractor skill entries below.
  CRITICAL for the renderer: every front-matter value that starts with `#` or holds a `:` is
  quoted (`key: #fff` is a YAML comment) - the emitter double-quotes every string scalar.
- Invariants held throughout: **measure, never guess - every MEASURED value traces to a pixel sample or a
  stated in-image reference**; luminance-ranked surface order; accent-usage inventory; ruthless component
  dedup. The one sanctioned non-measured value is a **PROPOSED** one: when measurement cannot supply a token,
  the `design-synthesizer` may fill it (and round the system out to best practice) with a value carrying
  `proposed: true` + a `rationale` and no evidence - always rendered with a `Source: proposed` marker so an
  invented value is never mistaken for a measured one. Measured and proposed provenance are mutually exclusive
  per token. Layer two's own non-measured case is the **invented** spec above - marked
  `> NEEDS ATTENTION`, never `Source: proposed`, since it covers a whole missing component/pattern rather than
  one token.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest - skills[] + agents[] is the catalog of record
                     (no hooks/ - superui ships no hooks and no injected manifest)
  agents/            The seven agents design-extractor, component-extractor and the two builders
                     dispatch between them, flat-named, each single-purpose (measuring:
                     foundation-analyst, spec-writer; judgment: source-scout, component-scout,
                     design-synthesizer, component-synthesizer, bundle-reviewer) - addressed via
                     the `Agent` tool by name
  scripts/           Plugin-root deterministic scripts, shared across skills - TypeScript (*.ts) run
                     directly by Node's native type stripping, `node:` builtins only, no npm deps and no
                     build step (plus check_node.sh - the Node env-check, run as an explicit early step
                     by each skill with a script step, no `!` preflight)
  skills/            Flat-named skills (single-domain plugin); shared scripts live at the plugin root
                     (scripts/, addressed via `${CLAUDE_PLUGIN_ROOT}/...`).
                     pro-designer bundles references/ only (its contrast script lives at the plugin-root
                     scripts/); setup bundles only its own scripts/check_env.sh (a diagnostic, never merged
                     into the plugin-root scripts/ since no other skill calls it); design-extractor and
                     both builders bundle nothing beyond their own SKILL.md - every deterministic
                     step they run lives at the plugin-root scripts/, every worker they dispatch lives at the
                     plugin-root agents/; component-extractor alone bundles its own
                     skills/component-extractor/references/ - the three platform reference files
                     (web-app.md, mobile.md, website.md), passed through to the agents it and its builder
                     dispatch as a `platform-ref:` path, never inlined into any SKILL.md
```

`pro-designer` and `component-extractor` are the only two skills with their own `references/` dir; there is
no plugin-root `references/` or `assets/` dir - each keeps its references local to the one skill that needs
them rather than sharing a plugin-root copy.

## Skills (flat-named, single domain)

- `pro-designer` - the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type ramps, 4/8pt
  spacing, accessibility, component states, form-validation UX, evidence-based conversion psychology with
  hard anti-dark-pattern rules, and anti-AI-slop aesthetic direction split across three references:
  `references/concepting.md` (the mandatory pre-layout concept brief - thesis, subject world, one narrow
  out-of-web reference anchor, named anti-references, signature element with a recurrence plan, section
  sequence with a layout family per section - plus the skeleton critique, required before any new
  Persuade/Experience surface even when a design system already exists), `references/distinctiveness.md`
  (refuse the recognizable generated-look defaults, subject grounding with the point-at-3-places physical-
  artifact rule, signature element with 3-point recurrence, consistency locks, copy as design material - the
  plan-then-critique pass now defers to `concepting.md`) and `references/anti-slop.md` (the forensic
  generated-UI tells catalog: an entropy meta-rule opening it, skeleton-level section-sequence tells with
  minimum-variation requirements, uniform-padding and cardocalypse limits, second-generation tells including
  the four clone looks, layout/visual/decoration tells covering the count reflex, the centered-section-header
  limit, untouched framework defaults and keyword-matched/sparkles AI iconography, hero discipline,
  app-dashboard and chat/AI-surface tells, demo-content realism, banned headline formulas and the default
  CTA tail, CTA-intent dedup). `anti-slop.md` is the one reference NOT routed on demand: SKILL.md opens with a
  **Step 0** gate loading it in full before any other reasoning, on every invocation and every job size, so the
  tells leave the candidate set before the first decision instead of being scrubbed out of a finished draft -
  hence it is deliberately absent from the "Reference routing" list, and the reference files point at it as
  already-loaded rather than telling the reader to go read it.
  `references/tokens.md` carries token-architecture
  doctrine (primitive/semantic/component layering, dark-mode-overrides-only-the-semantic-layer, paired
  surface/foreground tokens, role-based naming, derived radius/z-index scales) distilled from the
  ui-ux-pro-max-skill analysis. `references/motion.md` carries the animation doctrine (the four-question
  gate led by frequency, the static-page animation-opportunity hunt list, easing/duration budgets with
  strong custom curves, springs, interruption/enter/exit, clip-path recipes, gestures,
  transform/opacity-only performance rules, reduced-motion and hover gating, plus a scroll-reveal budget and
  a content-visible-without-JS rule for Persuade/Experience surfaces);
  components-states.md keeps only the page-level motion deltas (stagger recipe, will-change,
  backdrop-filter placement) and defers the doctrine to motion.md. Its SKILL.md also carries four framings adapted
  from pbakaus/impeccable (Apache-2.0): the
  surface-mode taxonomy (Persuade/Operate/Read/Experience, chosen from the surface, not the product), the
  brief-wins rule, refinement-preserves-vs-redesign-replaces, and bounded QA passes (batched inspect-fix,
  max two rounds) - Final QA adds a screenshot-based check for new Persuade/Experience surfaces (full-page
  desktop + mobile renders via host tooling, or a code-only fallback when rendering is impossible; skeleton,
  domain-artifact, signature-recurrence and memorability tests plus the squint test applied on the image).
  Fires when creating, styling, or reviewing ANY interface. Bundles
  `references/` only - its contrast gate is the plugin-root `scripts/check_contrast.ts` (WCAG AA), addressed
  via `${CLAUDE_PLUGIN_ROOT}/...`; a missing interpreter is a skip-with-note pointing at `/superui:setup`,
  never a hard stop. Advisory only.
- `setup` - user-only (`disable-model-invocation: true`) environment diagnostic, `/superui:setup`. Runs its
  own bundled `scripts/check_env.sh`, which reports the Node runtime (via the plugin-root `check_node.sh`) as
  `NODE <cmd>` or `NODE MISSING` plus a `VERSION <v>` line when node exists - no third-party modules to check,
  the scripts run on Node alone. The skill's own `SKILL.md` turns those lines into the user-facing PASS/FAIL
  table with install hints; the script itself never prints that formatting. Never installs anything, never
  edits project files - diagnostic only. Every other skill's env-check step and pro-designer's contrast-script
  fallback point here on a missing interpreter/module.
- `design-extractor` - user-only (`disable-model-invocation: true`) head skill, `/superui:design-extractor
  <screenshots-dir> [<target>]`. Resolves the input - including `<out>` (`docs/design-system/`, or
  `docs/design-system/<target>/` when the optional second argument is given; `<target>` is taken verbatim,
  never invented and never asked for) - dispatches `source-scout` for the source map (its only agent; it
  never touches `component-scout`), asks the user any ambiguity questions via `AskUserQuestion` (the one call
  surface that only runs in the main context), transcribes the answers to `<run>/intake-answers.md` - the
  single file it writes itself - then hands off to `design-extractor-builder` for measurement and synthesis,
  and gates on its result. Measures nothing and authors no measured or generated artifact inline. Its two
  input gates differ by what the directory costs to lose: a stale `<run>` is `rm -rf`'d silently (scratch
  under `.temp/`), while a non-empty `<out>` STOPS for an `AskUserQuestion` wipe/abort answer, since it is
  committed and may carry hand edits a whole-bundle rebuild would destroy - the gate touches `DESIGN.md`
  only, any existing platform subdir is left untouched (with a staleness warning). After its Final report it
  ends with an `AskUserQuestion` loop (web app / mobile / website / finish): a platform choice confirms that
  platform's screenshots dir (default: this run's own source dir) and invokes `component-extractor` (Skill
  tool) with `<screenshots-dir> <platform> [<target>]`, relaying its report verbatim before re-asking; no
  answer or `finish` ends the skill.
- `design-extractor-builder` - internal fork worker (`user-invocable: false`, `context: fork`), reached only
  via the `Skill` tool from `design-extractor`. The mechanical tail: fans out to two of the agents below -
  `foundation-analyst` (x4, one per foundation) and `design-synthesizer` (x1) - and the plugin-root scripts to
  turn a resolved source dir + source map into `DESIGN.md` alone, no satellites and no `screens/`: merges the
  measured fragments (`build_registry.ts`), renders (`render_design_md.ts`, no inventory argument - the
  Components heading is fixed pointer boilerplate now), synthesizes proposed values for standing gaps and
  re-renders, then validates with `validate_bundle.ts --mode design`. Carries no inventory guard, no
  spec-writer fan-out, no screen copy/assemble step and no `bundle-reviewer` dispatch - those all moved to
  `component-extractor-builder`. Zero user conversation, zero inline design judgment - composes, dispatches,
  and gates on scripted validation.
- `component-extractor` - head skill, `/superui:component-extractor <screenshots-dir> <platform>
  [<target>]` (`platform`: `web-app` | `mobile` | `website`). Model-invocable via a guarded CSO
  `description:` (not user-only) so `design-extractor`'s ending loop can chain into it, while a user can also
  invoke it standalone against an already-extracted `DESIGN.md`. Hard-stops before creating any run state
  when `docs/design-system/[<target>/]DESIGN.md` is absent, pointing at `/superui:design-extractor` to
  produce it first. Resolves `<out>` one level deeper than `design-extractor`'s -
  `docs/design-system/[<target>/]<platform>/` - dispatches `source-scout` for the source map and
  `component-scout` (with the resolved platform reference path) for the inventory, surfaces the inventory's
  `## Gaps` entries to the user alongside every component/pattern/inconsistency, then hands off to
  `component-extractor-builder`. Its non-empty-`<out>` gate is scoped to this one platform subdir only -
  `DESIGN.md` and any sibling platform subdir are left untouched. A leaf skill - its Final report is the end,
  no further chaining.
- `component-extractor-builder` - internal fork worker (`user-invocable: false`, `context: fork`), reached
  only via the `Skill` tool from `component-extractor`. The mechanical tail: parses `DESIGN.md` back into a
  registry (`parse_design_md.ts`), fans out to `spec-writer` (one per observed inventory entry, batched ~5)
  and `component-synthesizer` (one per `## Gaps` entry, batched ~5) - the other three agents below - copies
  canonical screens (`copy_screens.ts`), assembles both satellites (`assemble_specs.ts` x2), validates with
  `validate_bundle.ts --mode platform`, then dispatches `bundle-reviewer` (with the platform reference path)
  once over the finished bundle. Zero user conversation, zero inline design judgment.

## Agents (dispatched by the two head skills and their builders)

Dispatch is split 2+5 across the four skills above: `design-extractor` dispatches `source-scout`;
`design-extractor-builder` dispatches `foundation-analyst` and `design-synthesizer`; `component-extractor`
dispatches `source-scout` again and `component-scout`; `component-extractor-builder` dispatches `spec-writer`,
`component-synthesizer`, and `bundle-reviewer`.

- `source-scout` - maps the screenshots dir into a source map (screen roles, dedup hints); measures nothing,
  and carries no `Bash` tool - judgment-only, like `component-scout`.
- `foundation-analyst` - measures ONE foundation per invocation (colors, typography, dimensions, or
  effects-motion) via the plugin-root `sample_colors.ts` / `measure_geometry.ts`, writing a
  `notes-<foundation>.json` fragment; fanned out once per foundation for parallelism.
- `component-scout` - builds the deduplicated component/pattern inventory from the source map. Accepts an
  optional platform reference path: when given, reads its `## Component taxonomy` for classification
  vocabulary and diffs the inventory against its `## Expected components checklist`, writing every uncovered
  checklist item as a `## Gaps` entry line (slug, kind, the checklist's `expected:` reason) - present only
  when a reference was given, empty-but-printed when the checklist is fully covered.
- `spec-writer` - writes ONE inventory entry's internal `<run>/specs/components/<slug>.md` or
  `<run>/specs/patterns/<slug>.md` from the merged registry plus the source screens; fanned out once per
  entry. Accepts an optional platform reference path and applies its `## Interaction states` vocabulary and
  `## Spec guidance` deltas. `assemble_specs.ts` later consolidates these into the two shipped satellites.
- `design-synthesizer` - fills the registry's `unknowns` and rounds the system out to best practice with
  PROPOSED tokens/textStyles (`proposed: true` + `rationale`, no evidence), writing one
  `foundation:"proposed"` fragment plus a `resolved` list of the unknowns it covered; grounds every proposal
  in the preloaded `pro-designer` skill (`skills:` frontmatter). Runs once, after measurement and
  missing-token resolution. Never measures, never edits a measured value; never proposes a `shadow.*`/
  `gradient.*` token where `registry.json` already carries a measured one for that surface, even when its
  value is `none` - a measured `none` is the surface's stated answer, not a slot left open for a proposal
  (`shadow.*`/`gradient.*` belong to the effects-motion `foundation-analyst` alone; no other foundation, and no
  synthesizer proposal, writes either prefix once a measurement exists).
- `component-synthesizer` - writes ONE invented spec for ONE `## Gaps` entry line, grounded in the preloaded
  `pro-designer` skill (`skills:` frontmatter) plus the given platform reference's taxonomy and spec guidance;
  cites only tokens already present in `registry.json` (a property with no fitting token becomes a
  `MISSING-TOKENS:` entry, never a guessed value). Opens the spec with
  `> NEEDS ATTENTION: invented, not observed - review before use`, carries `canonical: none` in place of a
  real screen reference, and writes the same `border:`/`shadow:`/`gradient:` line contract `spec-writer`
  does. Never measures, never touches an existing spec, `DESIGN.md`, or the registry.
- `bundle-reviewer` - judgment-only reviewer over the finished platform bundle (accent discipline, dedup
  correctness, state-form completeness, surface-order coherence, and a fifth `flat-render` category - a spec
  declaring `shadow:`/`gradient:`/`border: none` while the registry carries a measured token for that
  surface, or a state description changing only a color where the measured record shows a border/shadow
  change too). Accepts an optional platform reference path and reviews state-form completeness and taxonomy
  fit against it. Never measures, never edits.

## Architecture invariants (superui-specific)

- **No hooks, no manifest.** Unlike superdev, superui ships no `hooks/` at all - neither a `SessionStart`
  manifest injection nor a `PreToolUse` plan gate. `pro-designer` is reached purely through its CSO
  `description:`; `setup` and `design-extractor` are user-only commands; `component-extractor` is
  model-invocable through its own guarded CSO `description:` (the deliberate exception - it exists to be
  chained by `design-extractor`'s ending loop, not only run by hand); `design-extractor-builder` and
  `component-extractor-builder` are internal forks reached only via the `Skill` tool from their own head
  skill. Do not reintroduce a dispatcher manifest unless routing genuinely stops working through descriptions
  alone.
- **Orchestrator does no worker work.** An orchestrator SKILL.md is a checklist plus gates; screenshots are
  read and artifacts authored ONLY by its agents, and deterministic steps are scripts the orchestrator runs.
  All four pipeline skills hold to this: each head skill's one exception is writing the user's own intake
  answers, since `AskUserQuestion` runs only in the main context.
- **Single writer per file.** Each artifact has exactly one producer per run. Never two agents into one file.
- **Scripts are trusted by their caller.** A self-verifying script carries its I/O contract in its header
  comment; the caller does not re-verify or retry its result.

## Scripts inventory

All `*.ts` scripts are plain ESM TypeScript with erasable syntax only, run directly by Node's native type
stripping (`node <script>.ts`; the `check_node.sh`-resolved command adds `--experimental-strip-types` on
22.6–23.5) - `node:` builtins only, no npm dependencies, no build step. Relative imports are not limited to
`vendor/`: alongside `sample_colors.ts` -> `vendor/` and `measure_geometry.ts` -> `vendor/`, two shared
contract modules are imported across `scripts/` itself - `section-model.ts` by `build_registry.ts`,
`render_design_md.ts` and `parse_design_md.ts`, and `inventory-format.ts` by `validate_bundle.ts`,
`render_design_md.ts`, and `copy_screens.ts`.

- `scripts/check_node.sh` - the Node.js env-check; run as an explicit early step (`sh
  "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`) by every skill with a script step - no `!` preflight.
  Emits `NODE_OK <cmd>` (`node`, or `node --experimental-strip-types` on 22.6 <= v < 23.6) or
  `NODE_MISSING` (absent / < 22.6) -> the script-dependent skills respond differently, not uniformly:
  `pro-designer`'s contrast gate skips that check with a note pointing at `/superui:setup` and the rest of
  the (advisory-only) review continues; `design-extractor-builder` and `component-extractor-builder` both
  hard-stop immediately, write nothing, and return a single line pointing at `/superui:setup`.
- `scripts/sample_colors.ts` - k-means palette / exact pixel sampling; `--regions` ranks named region
  backgrounds by luminance (the measured surface/elevation order). The color half of the
  "measure, never guess" invariant.
- `scripts/measure_geometry.ts` - pixel-geometry sampler covering what color sampling does not: paddings,
  gaps, border widths, control heights, corner radii, shadow falloff, gradient classification, ink/cap-height
  bounds. Five independent measurement modes selected per invocation (`--edges`, `--radius`, `--shadow`,
  `--gradient`, `--ink`). `--shadow` reports the full falloff profile - `samples[]` (per-step `offset`/
  `delta`/`hex`), `peakOffset`, `peakHex` alongside `extent`/`peakDelta`/`bgHex` - and `peakDelta`/`samples[]`
  are tolerance-independent (a fixed settle floor, not `--tol`), so a shadow whose maximum per-channel delta
  sits under the default `--tol 8` is still reported in full instead of vanishing. `--gradient x,y,w,h --axis
  h|v` walks the box's midline and reports `startHex`/`midHex`/`endHex`, `totalDelta`, `maxDeviation` and a
  `verdict` of `flat|linear|nonlinear`, itself tolerance-independent. The geometry half of the "measure, never
  guess" invariant, run by `foundation-analyst`.
- `scripts/section-model.ts` - the one shared contract module declaring the `3.N` section list: `SECTION_IDS`
  (all ten, in order), `SECTION_TITLES`, the token-legal `TOKEN_BACKED_SECTIONS` subset (every id except the
  field-backed 3.3/3.4 and the derived 3.10), and the two regexes built from it. `build_registry.ts` imports it
  to reject a token declaring a field-backed section; `render_design_md.ts` imports it for the section list and
  titles it renders; `parse_design_md.ts` imports `SECTION_TITLES` to locate each `### 3.N` subheading it
  parses back. Pure constants - no I/O.
- `scripts/inventory-format.ts` - the one shared contract module parsing the two line formats every downstream
  stage reads: a satellite's `canonical: <filename>` line (`CANONICAL_LINE_RE`, `canonicalRefs`) and an
  `inventory.md` entry's U+00B7 (`·`)-delimited fields (`parseInventoryEntries`). `validate_bundle.ts`,
  `render_design_md.ts`, and `copy_screens.ts` all import it instead of each keeping its own regex/split logic.
  Pure parsing - no I/O.
- `scripts/build_registry.ts` - merges the per-foundation `notes-<foundation>.json` fragments the
  `foundation-analyst` agents write, plus the `design-synthesizer`'s `foundation:"proposed"` fragment, into
  one `registry.json`, the sole resolution namespace `render_design_md.ts` and `validate_bundle.ts` read
  against. A proposed token carries `proposed: true` + `rationale` (no `evidence`); any `unknowns` entry a
  fragment lists under `resolved` (matched by section + `what`) is dropped from the merged `unknowns`, so a
  filled gap never also renders as `> NEEDS INPUT`. A token naming a field-backed section (3.3/3.4, per
  `section-model.ts`) exits 1 naming the token and its section; a duplicate name in any merged namespace
  (`textStyles[].name`, `surfaceOrder[].region`, an `accentUsage` screen+where+token triple) - across fragments
  or within one fragment's own array - exits 1 naming both source fragments (or the one fragment, twice).
  Internal to `.temp/` - never enters the bundle.
- `scripts/parse_design_md.ts` - the inverse of `render_design_md.ts`: reconstructs a registry-shaped JSON
  (`tokens`, `textStyles`, `surfaceOrder`, `accentUsage`, `unknowns: []`) from an already-rendered `DESIGN.md`
  body - the `### 3.N` tables/lists are authoritative, never the front matter (a derived subset that cannot
  itself distinguish measured from proposed or carry `surfaceOrder`/`accentUsage`). `evidence` always comes
  back `null` and `unknowns` always `[]` - no downstream consumer needs either reconstructed. Consumed by
  `component-extractor-builder`'s step 1, so a platform bundle is built against exactly the tokens a
  committed `DESIGN.md` carries, never a stale in-memory registry from the original extraction run. CLI:
  `parse_design_md.ts DESIGN_MD OUTPUT_JSON`. A round-trip test (render a fixture registry, parse it back)
  lives in `tests/superui/`.
- `scripts/render_design_md.ts` - the sole writer of `DESIGN.md`. Reads a merged `registry.json` alone (no
  inventory argument - the Components section is fixed pointer boilerplate pointing at
  `/superui:component-extractor`, never a rendered inventory) and emits the seed: YAML front matter FIRST
  (quoted, DTCG-shaped light tokens - `colors` from 3.1+3.2, `typography` from 3.5 families + textStyles,
  `spacing` from 3.6, `rounded` from 3.7 `radius.*`, `shadows` from 3.8 `shadow.*`, `gradients` from 3.8
  `gradient.*` - each map rendered `{}` when empty) then the prose body under the fixed standard headings, the
  old `## 3.N` sections (from `section-model.ts`) surviving as `###` subsections; section 3.8's rendered body
  is split by name prefix into a `**Shadows**` table, a `**Gradients**` table and a remaining table (mirroring
  3.7's radius/border split). Never invents, rounds, or infers a value itself - an entry listed in `unknowns`
  renders as `> NEEDS INPUT: <what> - <reason>`; Overview and Do's-and-Don'ts are mechanical only (counts +
  fixed boilerplate). A `proposed` token/textStyle renders as a real body row with a `Source` column
  (`measured|proposed`) and its `rationale` in `Notes`; the `> Legend` and a `> Note` (front-matter defaults vs
  authoritative body Source columns, PLUS the reference-px-@1x declaration and how to read shadow notation
  and map units per platform) sit BELOW the closing front-matter `---`. CLI: `render_design_md.ts
  REGISTRY_JSON OUTPUT_MD [--source <label>]`.
- `scripts/assemble_specs.ts` - consolidates a dir of per-entry intermediate specs into ONE satellite
  (`assemble_specs.ts SPECS_DIR OUTPUT_MD`, run once per kind). Each `<slug>.md` is wrapped under a `## <slug>`
  heading derived from the FILENAME; every ATX heading inside a spec body is shifted down on inclusion - h1 and
  h2 both to h3, h3-h5 down one, h6 clamped, fenced regions skipped - so the slug wrappers stay the only `## `
  headings in the satellite; an empty dir yields a titled "None catalogued." stub, exit 0. The sole writer of
  its satellite.
- `scripts/copy_screens.ts` - the canonical-screen copier: reads `inventory.md`'s `## Components` /
  `## Patterns` entries (via `inventory-format.ts`), copies every deduplicated `canonical:` filename present in
  the resolved source dir into `<out>/screens/`, and skips (exit 0) one that is absent - `validate_bundle.ts`
  reports that gap later as a `missing-screen` finding, this script never fails on it. Self-verifies by
  re-reading `<out>/screens/` after copying. `component-extractor-builder`'s step 5 runs it as a script step.
  CLI: `copy_screens.ts INVENTORY_MD SOURCE_DIR OUT_DIR`.
- `scripts/validate_bundle.ts` - validates a finished bundle dir against `registry.json` and its own internal
  cross-references, in one of two mutually exclusive modes selected by a required `--mode` flag. `--mode
  design` (`design-extractor-builder`'s output, `DESIGN.md` alone): the fixed standard headings present +
  non-empty, plus the forbidden-artifact check - no token or screen references exist yet to check.
  `--mode platform` (`component-extractor-builder`'s output, the two satellites `DESIGN.components.md` /
  `DESIGN.patterns.md` + `screens/`, no `DESIGN.md` involved): token citations (backtick dotted refs in the
  satellites), CANONICAL screen citations (every satellite `canonical:` line, parsed via
  `inventory-format.ts`'s `canonicalRefs`), and every `## <slug>` block carrying a `border:`, `shadow:` and
  `gradient:` property line - the section-headings check is skipped entirely, there is no `DESIGN.md` in this
  mode. A `canonical:` filename absent from `screens/` - including one containing spaces - emits a
  `missing-screen` finding, EXCEPT the literal value `none` (an invented spec's deliberate no-canonical-screen
  declaration), which never yields one; a block missing one of the three effect lines emits a
  `missing-effect-line` finding per missing property (up to three per block) - `none` is a satisfying value
  for any of the three, only the line itself is required. Both modes always run the forbidden `css/js/html/
  json` artifact check. Never mutates the bundle. CLI: `validate_bundle.ts BUNDLE_DIR REGISTRY_JSON --mode
  design|platform`.
- `scripts/check_contrast.ts` - WCAG AA contrast gate (pro-designer).
- `scripts/vendor/png-decode.ts` - from-scratch PNG decoder on `node:zlib` (color types 0/2/3/4/6, bit
  depths 1–16, all filters; interlaced -> clear unsupported error). `scripts/vendor/jpeg-decode.ts` - the
  vendored jpeg-js decoder (MIT, attribution + source commit in its header). Consumed by `sample_colors.ts`
  and `measure_geometry.ts`.
- `skills/setup/scripts/check_env.sh` - diagnostic-only, always exits 0; reports `NODE <cmd>|MISSING` (via
  `check_node.sh`) plus a `VERSION <v>` line whenever node exists. Not shared by any other skill - stays
  under `setup`, not the plugin root.
