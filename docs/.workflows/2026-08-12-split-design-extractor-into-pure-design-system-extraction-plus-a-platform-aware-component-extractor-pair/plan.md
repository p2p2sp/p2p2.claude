# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Split design-extractor into pure design-system extraction plus a platform-aware component-extractor pair"

---
<!-- HEADER -->

## Goal
`/superui:design-extractor <screenshots-dir> [<target>]` extracts ONLY the pure, platform-neutral design system (`DESIGN.md`) and then offers, in a loop, to chain component/pattern extraction per platform. A new `/superui:component-extractor <screenshots-dir> <platform> [<target>]` (platform: `web-app` | `mobile` | `website`) works both chained and standalone: it reads the existing `DESIGN.md`, builds the platform component/pattern bundle at `docs/design-system/[<target>/]<platform>/` (`DESIGN.components.md`, `DESIGN.patterns.md`, `screens/`), fills components missing against a per-platform checklist by inventing specs marked as needing attention, and uses the same multi-agent fan-out discipline as today's pipeline.

## Context
Today design-extractor produces the whole bundle in one run and is web-biased (CSS vocabulary, hover/focus states, desktop-web surface names). The confirmed design splits it: foundations stay in design-extractor (source-scout + 4x foundation-analyst + design-synthesizer + scripts), while component-scout, spec-writer and the satellites move to a new component-extractor + component-extractor-builder pair parameterized by platform reference files. Notation is neutralized declaratively (reference px @1x, shadow as neutral measurement notation) without changing the token data shape. Gaps against the platform checklist are listed by component-scout, user-reviewable in the head's inventory loop, and invented by a new component-synthesizer agent (preloads pro-designer) with `> NEEDS ATTENTION` marking. Out of scope: token data-shape change, pro-designer content changes, migration of existing host bundles, other plugins.

## Acceptance criteria
1. `superui/scripts/parse_design_md.ts` exists and reconstructs a registry-shaped JSON (`tokens`, `textStyles`, `surfaceOrder`, `accentUsage`, `unknowns: []`) from a rendered `DESIGN.md` body; a round-trip test (render a fixture registry, parse it back) passes under `node --test`.
2. `superui/scripts/render_design_md.ts` renders `DESIGN.md` without an inventory argument (CLI `REGISTRY_JSON OUTPUT_MD [--source <label>]`), its Components section is fixed pointer boilerplate to per-platform satellites, and its post-front-matter note declares "reference px @1x" plus how to read shadow notation and map units per platform.
3. `superui/scripts/validate_bundle.ts` supports `--mode design` (validates `DESIGN.md` only: sections + forbidden artifacts) and `--mode platform` (validates satellites + `screens/` against a registry JSON: token refs, screen refs, effect lines, forbidden artifacts - no `DESIGN.md` section check), and a `canonical: none` line yields no `missing-screen` finding.
4. Three platform reference files exist under `superui/skills/component-extractor/references/` (`web-app.md`, `mobile.md`, `website.md`), each carrying: interaction-state vocabulary, unit mapping from reference px, surface/component taxonomy with atomic/composite examples, and an expected-components checklist.
5. `superui/agents/component-scout.md`, `superui/agents/spec-writer.md` and `superui/agents/bundle-reviewer.md` each accept an optional `platform reference:` input path and use it (taxonomy + checklist -> `## Gaps` section in the inventory; state vocabulary; platform-aware review); `superui/agents/component-synthesizer.md` exists, preloads `pro-designer` via `skills:`, and writes one invented spec per gap entry from registry tokens only, opening with `> NEEDS ATTENTION: invented, not observed` and carrying `canonical: none` plus the three effect lines.
6. `superui/agents/source-scout.md`, `superui/agents/foundation-analyst.md` and `superui/agents/design-synthesizer.md` carry no web-only vocabulary: screen classes instead of desktop/tablet/mobile viewports, platform-neutral interaction-state and surface wording, shadow described as offset/blur/color measurement notation (not "CSS shadow shorthand"), spacing ramp phrased in reference px.
7. `superui/skills/design-extractor/SKILL.md` no longer dispatches component-scout nor mentions satellites/screens as its output, hands off without an `inventory:` line, and ends with an `AskUserQuestion` loop (web app / mobile / website / finish) that confirms a screenshots dir per platform (default: the same dir) and invokes `component-extractor` via the Skill tool; `superui/skills/design-extractor-builder/SKILL.md` drops the inventory guard, spec-writer fan-out, copy/assemble steps and bundle-reviewer, renders via the new `render_design_md.ts` CLI, and validates with `--mode design`.
8. `superui/skills/component-extractor/SKILL.md` (head: model-invocable for chaining, guarded description, `argument-hint: <screenshots-dir> <platform> [<target>]`, hard stop when `docs/design-system/[<target>/]DESIGN.md` is absent) and `superui/skills/component-extractor-builder/SKILL.md` (fork worker: parse DESIGN.md -> registry, spec-writer fan-out batched ~5, component-synthesizer per gap batched ~5, copy_screens, assemble_specs x2, validate `--mode platform`, bundle-reviewer) exist and follow the labeled-args handoff convention.
9. `superui/.claude-plugin/plugin.json` lists the two new skills in `skills[]` and `component-synthesizer` in `agents[]`; `superui/CLAUDE.md`, root `CLAUDE.md` and `README.md` describe the new two-stage pipeline.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superui): add parse_design_md.ts reconstructing a registry from DESIGN.md
- Covers: criteria #1, #10
- TDD: required

### Dependencies
- none

### Files
- add - superui/scripts/parse_design_md.ts (main, parseFrontMatter, parseBodyTables)
- add - tests/superui/parse_design_md.test.ts

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/superui/parse_design_md.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task.
2. Write `parse_design_md.ts` with CLI `parse_design_md.ts DESIGN_MD OUTPUT_JSON`: read `DESIGN.md`, parse the `### 3.N` body tables (the authoritative source - the front matter is a derived subset) into `{ tokens, textStyles, surfaceOrder, accentUsage, unknowns: [] }` matching the registry shape `build_registry.ts` emits. A `Source` column value `proposed` sets `proposed: true` (no `evidence`); `measured` rows get `evidence: null` (the parser cannot reconstruct evidence and no consumer needs it). Parse 3.3 into `surfaceOrder`, 3.4 into `accentUsage`, 3.5 style rows into `textStyles`. Reuse `SECTION_TITLES` / section regexes from `superui/scripts/section-model.ts`.
3. Self-verify per script convention (re-read OUTPUT_JSON, assert non-empty `tokens`), print one `PARSE_DESIGN_OK tokens=<n> textStyles=<n> -> <OUTPUT_JSON>` line, exit 0; exit 1 on unreadable/malformed input, exit 2 on usage errors; document the I/O contract in the header comment.
4. Tests: a round-trip case (build a fixture registry, render it with `render_design_md.ts`, parse the output, assert tokens/textStyles/surfaceOrder/accentUsage survive), a proposed-token case, an error case (missing file, no tables). Follow `tests/superui/render_design_md.test.ts` harness patterns and `slash()` from `tests/harness/paths.ts`.

### Edge cases
- `DESIGN.md` with empty maps/tables (a minimal system) -> valid JSON with empty collections, still exit 0 when at least one token exists; zero tokens overall -> exit 1 naming the file.
- Multi-line or escaped cell values (quoted hex, family stacks with commas) parse without truncation.
- `> NEEDS INPUT` blockquote lines inside sections are ignored (unknowns stay `[]`).

### Contracts
- New CLI: `parse_design_md.ts DESIGN_MD OUTPUT_JSON` -> registry-shaped JSON consumed by spec-writer dispatches, `validate_bundle.ts --mode platform`, component-synthesizer and bundle-reviewer. `unknowns` is always `[]`; `evidence` is always `null`.

### DoD
`parse_design_md.ts` round-trips a rendered fixture bundle; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superui): render DESIGN.md without inventory and with neutral-notation note
- Covers: criteria #2, #10
- TDD: none

### Dependencies
- none

### Files
- modify - superui/scripts/render_design_md.ts (main, renderBody, renderComponentsOverview, header comment)
- modify - tests/superui/render_design_md.test.ts

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/superui/render_design_md.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Change the CLI to `render_design_md.ts REGISTRY_JSON OUTPUT_MD [--source <label>]`: drop the `INVENTORY_MD` positional in `main`, drop the `parseInventoryEntries` import, and replace `renderComponentsOverview(inventoryMd)` with fixed boilerplate stating components/patterns are extracted per platform by `/superui:component-extractor` into `<platform>/DESIGN.components.md` / `<platform>/DESIGN.patterns.md`.
2. Extend the `> Note` block below the closing front-matter `---` with the neutral-notation declaration: all dimension values are reference px measured at 1x (web 1:1, iOS pt, Android dp), shadows are recorded as offset/blur/color measurement notation, and platform mapping guidance lives in the platform bundles.
3. Update the header comment (IN/OUT/Usage) and `usageText`, and update `tests/superui/render_design_md.test.ts`: remove inventory fixtures/args, assert the new Components boilerplate and the new note lines.

### Edge cases
- Passing three positionals (old CLI form) -> exit 2 usage error naming the new form.
- Registry with zero tokens still renders all nine `STANDARD_HEADINGS` (existing behavior preserved).

### Contracts
- Changed CLI: `render_design_md.ts REGISTRY_JSON OUTPUT_MD [--source <label>]`. The old caller (`design-extractor-builder` step 4) is updated in Task 7 - until then only tests call the script, which is safe in this no-runtime source repo.

### DoD
Renderer works without inventory, note carries the @1x declaration; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superui): add design and platform validation modes to validate_bundle.ts
- Covers: criteria #3, #10
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/validate_bundle.ts (main, checkScreenRefs, checkSections, usageText, header comment)
- modify - superui/scripts/inventory-format.ts (canonicalRefs)
- modify - tests/superui/validate_bundle.test.ts
- modify - tests/superui/inventory-format.test.ts

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/superui/validate_bundle.test.ts"`
- `node --test "tests/superui/inventory-format.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task.
2. Add a required `--mode design|platform` flag to `main`. `design`: run `checkSections` + `checkForbidden` only (BUNDLE_DIR holds just `DESIGN.md`; REGISTRY_JSON stays a required arg for CLI uniformity but token refs are not checked). `platform`: run `checkTokenRefs` + `checkScreenRefs` + `checkEffectLines` + `checkForbidden`, skipping `checkSections` (no `DESIGN.md` in a platform dir). No flag -> exit 2 usage error.
3. In `canonicalRefs` (`inventory-format.ts`), drop refs whose filename is the literal `none` so an invented spec's `canonical: none` produces no `missing-screen` finding and no copy attempt in `copy_screens.ts` (shared consumer). Update `inventory-format.ts`'s header comment: document the `none` rule and drop `render_design_md.ts` from its importer list (Task 2 removes that import).
4. Update header comments and tests: mode-selection cases, a platform-dir fixture without `DESIGN.md` staying clean, a `canonical: none` satellite case, and existing fixtures switched to explicit modes.

### Edge cases
- `--mode design` on a dir that also holds satellites -> satellites are simply not checked (no finding).
- `--mode platform` with an entirely empty satellite stub ("None catalogued.") -> zero findings (existing fail-open behavior preserved).
- Unknown `--mode` value -> exit 2.

### Contracts
- Changed CLI: `validate_bundle.ts BUNDLE_DIR REGISTRY_JSON --mode design|platform`. Callers are the two builder skills (updated in Tasks 7 and 8).
- `canonicalRefs` contract change: literal `none` is never a reference (documented in `inventory-format.ts` header).

### DoD
Both modes behave per criteria #3; all listed test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): add per-platform reference files for component extraction
- Covers: criterion #4
- TDD: none

### Dependencies
- none

### Files
- add - superui/skills/component-extractor/references/web-app.md
- add - superui/skills/component-extractor/references/mobile.md
- add - superui/skills/component-extractor/references/website.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Write the three files with an identical section skeleton so agents can consume any of them uniformly: `# <Platform> reference`, `## Interaction states` (web-app: hover/focus-visible/active/disabled/error...; mobile: pressed/long-press/focused/disabled/swipe states...; website: hover/focus/visited/scroll-triggered...), `## Unit mapping` (from reference px @1x: web 1:1 px, mobile pt/dp with density note, website 1:1 px), `## Component taxonomy` (atomic/composite examples in platform vocabulary - e.g. mobile: nav bar, tab bar, sheet, list row; website: hero, nav header, footer, CTA block), `## Expected components checklist` (the minimal set a shippable app of that platform needs, one line each with a one-clause why), `## Spec guidance` (platform-specific spec deltas: e.g. mobile touch-target floor, website above-the-fold hero rules).
2. Keep each file lean per `.claude/rules/_skills.md` (deltas only, no tables, no italics); checklists stay flat slug-like names so `component-scout` can diff them against its inventory.

### Edge cases
- none (static reference content)

### Contracts
- The shared section skeleton above is the contract `component-scout`, `spec-writer`, `component-synthesizer` and `bundle-reviewer` read; heading names are pinned.

### DoD
Three files exist with the pinned skeleton; regression suite green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superui): platform-aware component agents and the component-synthesizer
- Covers: criterion #5
- TDD: none

### Dependencies
- Task 4 - blocks: the `platform reference:` input contract these agents consume

### Files
- modify - superui/agents/component-scout.md (Input, What to do, new Gaps rules)
- modify - superui/agents/spec-writer.md (Input, Variant versus state)
- modify - superui/agents/bundle-reviewer.md (Input, What to review)
- add - superui/agents/component-synthesizer.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `component-scout.md`: add optional `platform reference:` input (path). When present: use its `## Component taxonomy` for atomic/composite classification vocabulary, and diff the deduplicated inventory against `## Expected components checklist` into a fourth section `## Gaps` (after `## Inconsistencies`), one line per missing component: `- <slug> - <Display name> · atomic|composite · expected: <one-clause reason from the checklist>` - no `canonical:`, no `appears:`. When absent: no `## Gaps` section, current behavior.
2. `spec-writer.md`: add optional `platform reference:` input; when present, take the state list vocabulary in "Variant versus state" from its `## Interaction states` and apply `## Spec guidance` deltas; keep hover/disabled/error phrasing as examples only.
3. `bundle-reviewer.md`: add optional `platform reference:` input; `state-form` and `accent-sprawl` judgments use its `## Interaction states` vocabulary when present.
4. Add `component-synthesizer.md` modeled on `design-synthesizer.md`: frontmatter `description: Invoked only by superui design-extractor skills, never directly.`, `tools: Read, Write, Glob, Grep`, `model: sonnet`, `effort: high`, `skills: [pro-designer]`. Input: ONE `## Gaps` entry line, the registry JSON path (parsed from `DESIGN.md`), the platform reference path, the output spec path, optional re-dispatch inputs (previous spec + findings). Duty: write one component spec using ONLY existing registry tokens (dotted refs in backticks) grounded in pro-designer standards and the platform reference; the spec opens with `> NEEDS ATTENTION: invented, not observed - review before use`, carries `canonical: none`, the three effect lines per part, the same heading floor (`##`+) and machine surface as `spec-writer` specs; never a raw value - a value no token covers becomes a prose note plus a `MISSING-TOKENS:` entry in the final message. Hard rules: one spec only, never measure, never edit `DESIGN.md` or the registry.

### Edge cases
- Checklist item already covered by an observed component under a different name -> not a gap; `component-scout` matches by job, not by name, and notes the mapping in `## Inconsistencies`.
- Re-dispatched `component-scout` with strike constraints regenerates `inventory.md` in full without the struck gap entries (existing full-regeneration convention).

### Contracts
- `## Gaps` entry line format above (`·`-delimited, index 1 = `atomic|composite`, `expected:` instead of `canonical:`). `parseInventoryEntries(inventoryMd, "## Gaps")` parses these entries pattern-shaped (slug reliable; its `kind`/`canonical` fields not meaningful for a gap entry) - consumers use the slug and the raw line only; do NOT extend the parser.
- `component-synthesizer` final message: spec path + `MISSING-TOKENS:` block or `none` (mirrors `spec-writer`).

### DoD
Four agent files carry the contracts above; regression suite green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - refactor(superui): platform-neutral vocabulary in foundation agents
- Covers: criterion #6
- TDD: none

### Dependencies
- none

### Files
- modify - superui/agents/source-scout.md (Screen inventory, Phenomena to measure)
- modify - superui/agents/foundation-analyst.md (Colors coverage, Subtle effects, motion examples)
- modify - superui/agents/design-synthesizer.md (Two duties list)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `source-scout.md`: replace "viewport class (desktop/tablet/mobile...)" with a neutral screen-class judgment (form factor and density as observed, named freely); replace the fixed "hover/focus/selected/disabled/error" list with "interaction states as the platform shows them (e.g. pointer hover, press, focus, selected, disabled, error)".
2. `foundation-analyst.md`: replace the surface list "page/canvas, sidebar, content panel, topbar, cards, menus" with "every major region (base canvas, navigation surfaces, content surfaces, raised blocks, overlays)"; rephrase "derive the CSS shadow shorthand yourself" to "derive the shadow value in offset / blur / color notation" keeping the same measurement steps; make the motion examples platform-neutral ("a collapse, an overlay entrance, a transient notification"); "focus ring" in accent locations becomes "focus indicator".
3. `design-synthesizer.md`: "focus ring" -> "focus indicator"; "a 4/8px step ramp" -> "a 4/8 step ramp in reference px"; shadows/gradients wording unchanged otherwise (values keep today's notation - the neutralization is declarative, per the confirmed design).

### Edge cases
- Do not touch the measurement law, duty split, exits, or any token-name prefix (`shadow.*`, `border.*` etc.) - only prose vocabulary changes.

### Contracts
- none

### DoD
`grep -n "CSS\|viewport\|sidebar\|topbar\|hover/focus\|focus ring\|4/8px" superui/agents/source-scout.md superui/agents/foundation-analyst.md superui/agents/design-synthesizer.md` returns zero matches; regression suite green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - refactor(superui): design-extractor extracts only the design system and chains onward
- Covers: criterion #7
- TDD: none

### Dependencies
- Task 2 - blocks: new `render_design_md.ts` CLI the builder calls
- Task 3 - blocks: `--mode design` validation step

### Files
- modify - superui/skills/design-extractor/SKILL.md (description, Ground rules, Steps, Handoff, Final report, new Ending loop, Contracts)
- modify - superui/skills/design-extractor-builder/SKILL.md (Input contract, Ground rules, Steps, Return, Contracts)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Head `SKILL.md`: description/output become "DESIGN.md - the pure, platform-neutral design system"; Step 1's `<out>` gate narrows to the `DESIGN.md` FILE (present -> `AskUserQuestion` wipe/abort of that file only; platform subdirs under `<out>` are left untouched with a spoken warning that they become stale after re-extraction); delete Step 4 (inventory) and every `component-scout` mention; Handoff block drops the `inventory:` line; Final report reports `DESIGN.md` only (token counts, proposed counts, findings, NEEDS INPUT) and drops satellite/screens/commit-the-bundle wording in favor of "commit `DESIGN.md`".
2. Add the Ending loop after the Final report: `AskUserQuestion` single-select `web app` / `mobile` / `website` / `finish`; on a platform choice, a second `AskUserQuestion` confirms the screenshots dir (default: this run's source dir; Other = another path); then invoke `component-extractor` (Skill tool) with `<screenshots-dir> <platform> [<target>]` args (platform values: `web-app`, `mobile`, `website`); relay its report verbatim, then re-ask; `finish` ends the skill.
3. Builder `SKILL.md`: drop the `inventory:` input line and steps 1 (inventory guard), 5 (spec-writer), 6 (missing-token re-dispatch - it existed only for spec-writer output), 8 (copy_screens), 9 (assemble_specs), 11 (bundle-reviewer); renumber: 0 env check, 1 foundation fan-out x4, 2 `build_registry.ts`, 3 `render_design_md.ts <run>/registry.json <out>/DESIGN.md --source <source>` (new CLI), 4 design-synthesizer + re-merge/re-render (unchanged logic, cap 2), 5 `validate_bundle.ts <out> <run>/registry.json --mode design` (informational). Re-dispatch convention shrinks to foundation-analyst + design-synthesizer. Return: `DESIGN.md` path, token/textStyle counts, proposed and resolved-versus-standing counts, `FINDING:` lines, `> NEEDS INPUT` items.

### Edge cases
- Ending loop with no `component-extractor` answer possible (user aborts the question) -> treat as `finish`.
- Chained platform run reports its own hard stops (e.g. missing PNGs in the confirmed dir) through the relayed report; the loop still re-asks afterward.
- A `<target>` given to the head is passed through to every chained `component-extractor` call verbatim.

### Contracts
- Head-to-builder labeled block shrinks to: `run`, `out`, `source`, `source-map`, optional `intake`.
- Chain call contract: Skill tool -> `component-extractor` with `<screenshots-dir> <platform> [<target>]`.

### DoD
Both SKILL.md files match the step lists above; no `inventory`/`spec-writer`/`component-scout`/satellite references remain in either; regression suite green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - feat(superui): add component-extractor head and builder skills
- Covers: criterion #8
- TDD: none

### Dependencies
- Task 1 - blocks: `parse_design_md.ts` step
- Task 3 - blocks: `--mode platform` validation step
- Task 4 - blocks: platform reference paths the head resolves
- Task 5 - blocks: agent contracts the skills dispatch against

### Files
- add - superui/skills/component-extractor/SKILL.md
- add - superui/skills/component-extractor-builder/SKILL.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Head frontmatter: `name: component-extractor`; `description:` states what it does plus the guard "Invoked from the design-extractor ending loop or by the user command, never spontaneously." (simpleplan precedent - model-invocable so the Skill-tool chain works, NO `disable-model-invocation`); `user-invocable: true`; `argument-hint: <screenshots-dir> <platform> [<target>]`; `allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion`.
2. Head body mirrors design-extractor's shape: Step 1 intake gate - three args (`platform` must be `web-app`|`mobile`|`website`, else stop naming the legal values; missing screenshots dir -> `AskUserQuestion`); resolve `<design>` = `docs/design-system/[<target>/]DESIGN.md`, absent -> hard stop pointing at `/superui:design-extractor`; `<out>` = `docs/design-system/[<target>/]<platform>/`, non-empty -> `AskUserQuestion` wipe/abort; PNG-only gate identical to design-extractor's; `<run>` = `.temp/component-extractor/<run-slug>-<platform>/`, stale -> silent `rm -rf`; resolve `<platform-ref>` = `references/<platform>.md` under this skill's own base directory. Step 2 dispatch `superui:source-scout` -> `<run>/source-map.md` (GATE non-empty). Step 3 ambiguities -> `AskUserQuestion` -> `<run>/intake-answers.md`. Step 4 dispatch `superui:component-scout` with source, source-map, `<platform-ref>`, optional intake -> `<run>/inventory.md`; list components, patterns, GAPS and inconsistencies to the user; objections or gap strikes -> re-dispatch with constraints, cap 2. Handoff labeled block: `run`, `out`, `source`, `design`, `source-map`, `inventory`, `platform-ref`, optional `intake`; relay the return verbatim. Final report: `<out>` path, observed vs invented counts, every `> NEEDS ATTENTION` spec named for review, `MISSING-TOKENS` entries flagged as design-system gaps ("re-run `/superui:design-extractor` or extend `DESIGN.md`, never hand-edit the satellites"), findings and NEEDS INPUT items, commit reminder.
3. Builder frontmatter mirrors `design-extractor-builder` (`context: fork`, `model: sonnet`, `effort: medium`, `user-invocable: false`, guard description, same `allowed-tools`). Steps: 0 `check_node.sh` (NODE_MISSING -> one-line stop) + resolve sampler/geometry script paths; 1 `parse_design_md.ts <design> <run>/registry.json` GATE exit 0 (failure -> one-line return naming the parse error); 2 guard - zero entries across `## Components`, `## Patterns` AND `## Gaps` -> `EMPTY-INVENTORY` one-line return; 3 spec-writer fan-out per observed entry (batched ~5, platform-ref passed, re-dispatch cap 2); collect `MISSING-TOKENS:`/`NEEDS-INPUT:` blocks - MISSING-TOKENS are NOT re-dispatched anywhere (no analysts here): they carry into the return as design-system gaps; 4 component-synthesizer fan-out per `## Gaps` entry (batched ~5, registry + platform-ref, output `<run>/specs/components/<slug>.md`, re-dispatch cap 2); 5 `copy_screens.ts <run>/inventory.md <source> <out>`; 6 `assemble_specs.ts` x2 (components -> `<out>/DESIGN.components.md`, patterns -> `<out>/DESIGN.patterns.md`); 7 `validate_bundle.ts <out> <run>/registry.json --mode platform` (informational); 8 bundle-reviewer (`<out>`, inventory, registry, platform-ref) - never a gate, carried verbatim. Return: `<out>` path, observed component/pattern counts, invented count with slugs, `MISSING-TOKENS` list, `FINDING:` lines, `> NEEDS INPUT` and `> NEEDS ATTENTION` items.

### Edge cases
- `## Gaps` empty or absent (no platform checklist misses, or user struck all) -> step 4 skipped, zero invented specs, report says so.
- Zero observed entries but non-empty `## Gaps` -> pipeline proceeds invention-only (satellite from invented specs; `copy_screens` copies nothing).
- `DESIGN.md` present but unparseable (hand-mangled) -> step 1's one-line return tells the user to re-run `/superui:design-extractor`.
- Same platform re-run -> `<out>` wipe/abort gate protects the previous platform bundle.

### Contracts
- Head-to-builder labeled block: `run`, `out`, `source`, `design`, `source-map`, `inventory`, `platform-ref`, optional `intake` (paths only, never content).
- Both skills reuse existing plugin-root scripts and agents exclusively; no new scripts beyond Task 1's.

### DoD
Both SKILL.md files exist with the contracts above and pass a read-through against `.claude/rules/_skills.md` (no caller narrative in bodies, no tables/italics/emoji); regression suite green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - docs(superui): register the split pipeline in plugin.json, CLAUDE.md files and README
- Covers: criterion #9
- TDD: none

### Dependencies
- Task 5 - blocks: agent to register
- Task 7 - blocks: described behavior must match the rewritten skills
- Task 8 - blocks: skills to register

### Files
- modify - superui/.claude-plugin/plugin.json (skills[], agents[])
- modify - superui/CLAUDE.md (intro, handoff-bundle section, Layout, Skills, Agents, Scripts inventory)
- modify - CLAUDE.md (superui bullets in "What this repo is" and layout/self-documentation sections)
- modify - README.md (superui usage section)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `plugin.json`: append `./skills/component-extractor/` and `./skills/component-extractor-builder/` to `skills[]`; append `./agents/component-synthesizer.md` to `agents[]` (never both lists for one worker; leave `version` untouched - tag-driven).
2. `superui/CLAUDE.md`: six skills, seven agents, the 2+5 dispatch split (design-extractor: source-scout; design-extractor-builder: foundation-analyst, design-synthesizer; component-extractor: source-scout, component-scout; component-extractor-builder: spec-writer, component-synthesizer, bundle-reviewer); rewrite "The handoff bundle" to the two-layer shape (`DESIGN.md` at the target root, per-platform subdirs with satellites + screens); document `parse_design_md.ts` and the changed `render_design_md.ts` / `validate_bundle.ts` CLIs in the Scripts inventory; note component-extractor bundles `references/` (three platform files).
3. Root `CLAUDE.md`: update the superui description bullet (two-stage pipeline, six agents -> seven, component-extractor's routing mode - model-invocable with a guarded description for the chain, a deliberate exception to "user-only command" wording) and the self-documentation agent list.
4. `README.md`: update the superui section - the two commands, the chained flow, platform values, output layout.

### Edge cases
- none (documentation and manifest edits)

### Contracts
- none

### DoD
`plugin.json` parses as JSON and lists 6 skills + 7 agents; the four documents describe the same pipeline the Task 7/8 skills implement; regression suite green.

<!-- /TASK -->
