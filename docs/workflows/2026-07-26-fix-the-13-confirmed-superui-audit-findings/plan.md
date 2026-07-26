# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Fix the 13 confirmed superui audit findings"

---
<!-- HEADER -->

## Goal
Every one of the 13 confirmed findings from the `2026-07-26-superui` audit is closed at its root cause: the six `.ts` script defects are fixed and locked behind `node --test` regression suites, and the seven prompt/documentation contract defects state what the code actually does. The `superui` plugin ships no code path where an invented value renders as measured, no gate that passes a defective bundle, and no prompt that instructs a worker to produce output its own consumer rejects.

## Context
A `superfix:code-auditor` sweep of `superui` dispatched 14 detectives over 35 files and 181 artifact pairs; every report was independently replayed by a critic on a clean `git worktree`, yielding 13 confirmed findings (severity 6.5 to 2.0, 0 refuted). Full evidence, repro commands and per-finding fix sketches: `.temp/code-reviewer/2026-07-26-superui/findings.md`. The defects cluster into three root themes the critics identified: an unmeasured value can escape its provenance marker (findings 3, 8, 12), a deterministic gate can pass a defective bundle (findings 4, 5, 7), and a prompt can contradict the code it drives (findings 1, 9, 11, 12).

Two scope decisions, both confirmed with the user: test suites live in a new repo-root `tests/superui/` so nothing new ships inside the installed plugin, and finding 5 is fixed by loosening the canonical-line parse plus treating zero cited refs as a finding, leaving `validate_bundle.ts`'s CLI signature untouched.

Two things are deliberately NOT in scope. `build_registry.ts` reporting all shape errors in one pass (named in finding 1 as secondary hardening) - the prompt fix in Task 8 removes the trigger, and the multi-error report is a separate improvement with no confirmed defect behind it. The vendored decoders `scripts/vendor/{png,jpeg}-decode.ts` - the audit's largest coverage gap, never swept, and no finding names them.

Repo reality every task must respect: no build, no lint, no npm, no `package.json`. Scripts are ESM TypeScript run by Node's native type stripping, `node:` builtins only. Skill and agent markdown follows `.claude/rules/_skills.md` - bullets not prose, no tables, deltas not completeness.

## Acceptance criteria
1. Each of `measure_geometry.ts`, `build_registry.ts`, `render_design_md.ts`, `validate_bundle.ts`, `check_contrast.ts` can be imported from a test file without executing its CLI, and each still runs unchanged from the command line.
2. `fitRadius` returns the constructed ground-truth radius (0, 4, 8, 12, 16, 20 on hard-edged fixtures) instead of a value short by 2-3 px.
3. A `textStyles[]` entry or token that reaches the registry without `proposed: true` inside a `foundation: "proposed"` fragment is rejected, and a fragment's `resolved` list no longer clears an `unknowns` entry when the fragment flags nothing proposed.
4. A `usedFor` value containing `|` or a newline renders as exactly one table cell in sections 3.2 and 3.5, and a measured `notes` value on a 3.2 token renders even when no 3.2 row is proposed.
5. Section 3.10 renders a proposed dark value distinguishably from a measured one.
6. A `canonical:` line carrying leading markdown decoration is parsed as a screen reference, and a bundle whose non-empty satellites cite zero canonical screens yields a finding instead of `CLEAN`.
7. `check_contrast.ts` rejects an out-of-range `rgb()` component and a non-string JSON `fg`/`bg` with a usage message and exit 2, reserving exit 1 for a genuine AA failure, and `pro-designer/SKILL.md`'s stated reading of those exit codes matches.
8. A colors fragment authored strictly from `agents/foundation-analyst.md`'s stated output schema passes `build_registry.ts` on the first run, and no file in the plugin points at the nonexistent "Task 2" document.
9. A second `/superui:design-extractor` run on the same source directory ships no spec whose slug is absent from the current `inventory.md`.
10. Every `> NEEDS INPUT` item a `spec-writer` records reaches the builder's return message as an item, not a count.
11. `design-extractor-builder/SKILL.md`'s stated reason for not gating on reviewer findings is factually true, and `agents/bundle-reviewer.md` no longer claims every bundle value came from a deterministic script.
12. `skills/pro-designer/references/accessibility.md`'s contrast-gate invocation resolves correctly when `pro-designer` runs in an arbitrary host project.
13. `superui/CLAUDE.md` states the real agent ownership split and contradicts itself nowhere about `source-scout` or `check_env.sh`.
14. Root `README.md` and root `CLAUDE.md` state six agents under the correct dispatcher, root `README.md` no longer advertises `pro-designer` as teaching 60-30-10, and root `CLAUDE.md` reflects the new `tests/` tree instead of claiming the repo has no test tooling at any level.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - refactor(superui): guard CLI entry points so scripts are importable
- Covers: criteria #1
- TDD: none

### Dependencies
- none - blocks: Tasks 2, 3, 4, 5, 6, 7

### Files
- modify - superui/scripts/measure_geometry.ts (`main`)
- modify - superui/scripts/build_registry.ts (`main`)
- modify - superui/scripts/render_design_md.ts (`main`)
- modify - superui/scripts/validate_bundle.ts (`main`)
- modify - superui/scripts/check_contrast.ts (`main`, `parseColor`, `contrastRatio`)
- add - tests/superui/import-safety.test.ts (this task creates `tests/superui/`; its parent is the repo root, which exists)

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - exit 0, usage text (proves the file still type-strips and runs as a CLI)

*Tests*
- `node --test tests/superui/import-safety.test.ts` - all assertions pass, process exit code 0
- `node superui/scripts/build_registry.ts` - exit 2 with usage on stderr (CLI behavior unchanged)

### Approach
1. In each of the five scripts, import `fileURLToPath` from `node:url` and replace the unconditional bottom-of-file call (`main();` at `measure_geometry.ts:662`, `build_registry.ts:600`, `render_design_md.ts:696`, `validate_bundle.ts:322`, and `process.exitCode = main(process.argv.slice(2));` at `check_contrast.ts:228`) with the same guard: run it only when `process.argv[1]` resolves to `fileURLToPath(import.meta.url)`.
2. In `check_contrast.ts` add `export` to `parseColor`, `contrastRatio` and `main` so Task 7 can assert return codes without spawning a subprocess. Leave the other four scripts' existing export surface alone - Tasks 2-6 reach their targets through already-exported `fitRadius`, `validateShape`, `mergeFragments`, `renderSubsectionBody`, `renderTokenTable`, `renderTextStyles`, `checkScreenRefs` and `canonicalRefs`.
3. Write `tests/superui/import-safety.test.ts`: import all five modules plus `inventory-format.ts`, assert one known export is a function in each, and assert `process.exitCode` is still undefined or 0 after the imports.
4. Leave `copy_screens.ts`, `assemble_specs.ts` and `sample_colors.ts` untouched - no test imports them.

### Edge cases
- `PROG` is computed at module top level from `process.argv[1]` in every script; that is inert on import and must not move inside the guard.
- Under `node --test` the runner, not the script, owns `process.argv[1]`, so the guard must compare resolved absolute paths rather than a basename.
- Node 22.6-23.5 needs `--experimental-strip-types` on every command in this plan; from 23.6 plain `node` works. Resolve it the way `scripts/check_node.sh` does.

### Contracts
Each guarded script keeps its existing CLI contract byte for byte: same arguments, same stdout, same exit codes. New: importing any of the five is side-effect free.

### DoD
`node --test tests/superui/import-safety.test.ts` passes, and each of the five scripts invoked with no arguments still prints its usage and returns its documented exit code.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - fix(superui): correct the half-pixel bias in the corner-radius fit
- Covers: criteria #2
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/measure_geometry.ts (`predictedOffset`)
- add - tests/superui/measure_geometry.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing test first: build an in-memory `RgbImage` (`{width, height, rgb: Uint8Array}`, row-major RGB, exported at `measure_geometry.ts:74`) holding a 60x60 rounded rectangle whose corner is rasterised by the standard pixel-centre rule - pixel `(x,y)` is painted when its centre `(x+0.5, y+0.5)` lies inside the shape, the arc centre inset by `r` from both edges. Assert `fitRadius(img, {x,y,w,h}, "tl", tol)` returns exactly the constructed `r` for r = 0, 4, 8, 12, 16, 20. VERIFY-RED: today it returns 0, 2, 5, 9, 14, 18.
2. Fix `predictedOffset` to sample the pixel centre: let `cy = row + 0.5`, return 0 when `cy >= r`, set `d = r - cy`, and return `Math.max(0, Math.ceil(r - Math.sqrt(Math.max(0, r*r - d*d)) - 0.5))`. Change nothing in `fitRadius` itself.
3. VERIFY-GREEN: all six radii match, each at `confidence` 1.00.
4. Extend the suite to all four corners (`tl`, `tr`, `bl`, `br`) on the r = 12 fixture, and to a disc of diameter 60 in a 60x60 box, whose radius is 30 by symmetry with no rasterisation convention to argue about.
5. Correct the `predictedOffset` doc comment above `measure_geometry.ts:216`, which currently claims the test is "the same test used to render a rounded corner" - it now is.

### Edge cases
- `r = 0` (a sharp corner) must stay 0, not become negative - hence the `Math.max(0, ...)`.
- A uniform image with no edge still returns `radius = maxR` at low confidence; that pre-existing behavior is out of scope and must not regress into a crash.
- Antialiased corners stay approximate by nature; the suite asserts hard-edged fixtures only.

### Contracts
`fitRadius(img, box, corner, tol) -> {radius, confidence}` - signature unchanged, returned `radius` now matches the constructed ground truth.

### DoD
The suite is green, and a token measured through `--radius` matches the true CSS `border-radius` of the sampled corner.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - fix(superui): close the textStyle and resolved-list provenance holes
- Covers: criteria #3
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/build_registry.ts (`validateToken`, `validateTextStyles`, `validateShape`, `mergeFragments`)
- add - tests/superui/build_registry.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts` - exit 2 with usage

*Tests*
- `node --test tests/superui/build_registry.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing tests first, against the exported `validateShape(raw, filename)` and `mergeFragments(fragments)`: (a) a `foundation: "proposed"` fragment whose `textStyles[0]` carries `rationale` but omits `proposed` must throw `ShapeError`; (b) the same omission on a token in that fragment must throw; (c) `mergeFragments` must keep an `unknowns` entry whose only claimant fragment flagged nothing proposed. VERIFY-RED: (a) and (b) currently return a valid `Fragment`, (c) currently drops the entry.
2. Thread the fragment's `foundation` value into `validateTextStyles` and `validateToken` from `validateShape` (`build_registry.ts:336`), which already reads and validates `raw.foundation` at `:345` and today discards it.
3. Enforce two symmetric rules: inside a `foundation: "proposed"` fragment every token and every `textStyles[]` entry must carry `proposed: true`; in any other fragment a `textStyles[]` entry must not carry `rationale`, mirroring the existing token rule that a measured token needs `evidence` (`:212`).
4. In `mergeFragments` (`:469`), honour a fragment's `resolved` list only when that fragment contributed at least one entry flagged `proposed: true`.
5. VERIFY-GREEN, then confirm the untouched happy path still merges: a measured fragment plus a well-formed proposed fragment yields the same `registry.json` as before.

### Edge cases
- A `foundation: "proposed"` fragment carrying only `unknowns` and a `resolved` list, with no tokens or textStyles, is not itself rejected - rule 4 ignores its `resolved` list, so the gaps it claims to have filled keep rendering as `> NEEDS INPUT`.
- Error messages must keep the existing `<filename>: <what>` shape - `design-extractor-builder` step 7 feeds them back to the synthesizer verbatim as findings.
- Do not require `evidence` on a textStyle; textStyles have no such field and adding one would break every measuring analyst.

### Contracts
`validateShape(raw, filename) -> Fragment` and `mergeFragments(fragments) -> Registry` keep their signatures; both reject strictly more inputs than before, none fewer.

### DoD
The suite is green, and a synthesized textStyle that omits `proposed: true` fails the step-3 merge gate instead of shipping in `DESIGN.md` with no `Source` column.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - fix(superui): escape free text and decouple the Notes column in the hand-rolled tables
- Covers: criteria #4
- TDD: required

### Dependencies
- Task 1 - blocks: Task 5

### Files
- modify - superui/scripts/render_design_md.ts (`renderSemanticColors`, `renderTextStyles`)
- add - tests/superui/render_design_md.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/render_design_md.ts` - exit 2 with usage

*Tests*
- `node --test tests/superui/render_design_md.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing tests first, against the exported `renderSubsectionBody("3.2", registry)` (which dispatches to the private `renderSemanticColors`) and `renderTextStyles(textStyles)`. Split each emitted row on the unescaped `|` and assert the cell count equals the header's: (a) `usedFor: "page background | card surfaces"` must stay one cell; (b) `usedFor` containing a newline must not emit a second row; (c) a 3.2 token carrying `notes` and no proposed sibling must still render that note. VERIFY-RED: (a) drops a cell, (b) emits a phantom row, (c) drops the note entirely.
2. Route every free-text cell through the existing `cellSafe` helper (`:149`), exactly as `renderTokenTable` (`:166`) already does for its Notes cell: in `renderSemanticColors` (`:219`) that is `usedFor` and `primitive`; in `renderTextStyles` (`:266`) it is every string cell - `family`, `size`, `letterSpacing` and `usedFor`. That renderer has no `primitive` cell; its columns are name, family, size, weight, lineHeight, letterSpacing, usedFor, of which `weight` and `lineHeight` are numbers and `name` is validated dotted. Escaping all four strings rather than only `usedFor` costs nothing and removes the judgement call about which free text can contain a pipe.
3. In `renderSemanticColors`, decouple the two columns the way `renderTokenTable:169-175` already does: keep `Source` gated on `hasProposed`, but gate `Notes` on its own `hasNotes` computed from the rendered note cells. Keep header and body arity in lockstep.
4. VERIFY-GREEN, then assert the negative that must not regress: with no proposed row and no notes, the 3.2 table still emits exactly its five pinned columns.

### Edge cases
- Header and body must stay the same width in all four combinations of `hasProposed` x `hasNotes`.
- `usedFor` is enforced non-empty on every 3.2 token and every textStyle (`build_registry.ts:237,296`), so the escaping path is always exercised - it is not an optional field.
- `cellSafe` flattens newlines to a space; that is the intended lossy-but-safe behavior, not a defect to fix here.

### Contracts
`renderSubsectionBody(sectionId, registry) -> string` and `renderTextStyles(textStyles) -> string` keep their signatures; emitted tables become parser-safe.

### DoD
The suite is green, and a `DESIGN.md` rendered from a registry whose `usedFor` carries a pipe parses to the same cell count a real markdown table parser reports for the header.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - fix(superui): mark proposed values in the dark mode summary
- Covers: criteria #5
- TDD: required

### Dependencies
- Task 4 - blocks: nothing (Task 4 adds the shared `tests/superui/render_design_md.test.ts` this task extends; Task 4 in turn depends on Task 1)

### Files
- modify - superui/scripts/render_design_md.ts (`renderDarkModeSummary`)
- modify - tests/superui/render_design_md.test.ts

### Test Commands
*Build*
- `node superui/scripts/render_design_md.ts` - exit 2 with usage

*Tests*
- `node --test tests/superui/render_design_md.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing test first: a registry holding one measured token with a `dark` value and one `proposed: true` token with a `dark` value, asserting `renderSubsectionBody("3.10", registry)` emits distinguishable lines for the two. VERIFY-RED: both lines are byte-identically shaped today.
2. In `renderDarkModeSummary` (`:305`), append a provenance suffix to a proposed row's bullet, reusing the `measured|proposed` vocabulary the other three renderers already emit in their `Source` column. Leave an all-measured list unadorned so an untouched run's output does not churn.
3. VERIFY-GREEN, then assert the all-measured case still renders exactly the current bullet shape.

### Edge cases
- A registry with no `dark` value anywhere still returns `null` and renders `none` - unchanged.
- The `> Legend` and `> Note` banners above the body claim the body's Source columns are authoritative for provenance; 3.10 now honours that claim rather than being the one exception.

### Contracts
`renderSubsectionBody("3.10", registry) -> string` - signature unchanged; a proposed dark value is now self-describing.

### DoD
The suite is green, and a light-mode-only run whose entire dark palette is invented renders that palette as visibly proposed, satisfying the guarantee stated in `superui/CLAUDE.md`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - fix(superui): stop the canonical-screen gate failing open
- Covers: criteria #6
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/inventory-format.ts (`CANONICAL_LINE_RE`)
- modify - superui/scripts/validate_bundle.ts (`checkScreenRefs`)
- add - tests/superui/validate_bundle.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/validate_bundle.ts` - exit 2 with usage

*Tests*
- `node --test tests/superui/validate_bundle.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing tests first against the exported `canonicalRefs(content)`: assert `hero.png` is captured from each of `canonical: hero.png`, `- canonical: hero.png`, a two-space-indented line, `**canonical:** hero.png`, and `Canonical: hero.png`. VERIFY-RED: only the bare form is captured today.
2. Widen `CANONICAL_LINE_RE` (`inventory-format.ts:33`) to tolerate leading list markers, blockquote and heading markers, surrounding emphasis asterisks, and a capitalised label, staying anchored to line start and still capturing the whole trimmed remainder so a filename containing spaces survives. Update the header comment block at `:9-17`, which documents the current capture rule.
3. Add the fail-open backstop in `checkScreenRefs` (`validate_bundle.ts:151`): when a satellite carries spec content but the run cites zero canonical screens, emit a `missing-screen` finding naming that satellite instead of returning an empty list. Detect "carries spec content" as at least one `## ` slug heading - `assemble_specs.ts` writes a titled "None catalogued." stub for an empty dir, so byte-non-empty is not the same as populated. Write the failing test for it first.
4. VERIFY-GREEN, then assert the negatives that must not regress: a filename containing spaces still resolves (the behavior commit `e4cc1ae` added), a bundle with zero inventory entries and zero refs stays clean, and a satisfied reference still reports `CLEAN`.

### Edge cases
- Zero entries in the whole run is legitimately clean - the new finding must fire only when a satellite carries spec content.
- `CANONICAL_LINE_RE` is a module-level global regex consumed through `matchAll`, which does not mutate `lastIndex`; keep it that way.
- A `canonical:` line with trailing commentary still captures whole and surfaces as `missing-screen` - documented deliberate behavior, unchanged.

### Contracts
`canonicalRefs(content) -> string[]` and `checkScreenRefs(bundleDir) -> Finding[]` keep their signatures. `validate_bundle.ts`'s CLI stays `BUNDLE_DIR REGISTRY_JSON` - no third argument, no doc churn.

### DoD
The suite is green, and a bundle whose specs cite screens absent from `screens/` reports `missing-screen` regardless of how the citation line is decorated.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - fix(superui): validate contrast inputs and separate the exit codes
- Covers: criteria #7
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/check_contrast.ts (`parseColor`, `main`)
- modify - superui/skills/pro-designer/SKILL.md (the `Contrast` bullet in `## Final QA`)
- add - tests/superui/check_contrast.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/check_contrast.ts` - prints usage, exit 2

*Tests*
- `node --test tests/superui/check_contrast.test.ts` - all assertions pass
- `node superui/scripts/check_contrast.ts "#767676" "#ffffff" normal` - `4.54:1  AA(need 4.5): PASS`, exit 0

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing tests first against the now-exported `parseColor` and `main`: (a) `parseColor("rgb(999,999,999)")` must throw; (b) `main(["rgb(999,999,999)", "#000"])` must return 2, not 0; (c) a JSON file whose record carries a numeric `fg` must return 2, not crash with a `TypeError`; (d) a genuine AA failure must still return 1. VERIFY-RED: (a) returns `[999,999,999]`, (b) prints `482.97:1 PASS` and returns 0, (c) throws from `pyStrip`.
2. In `parseColor` (`:106`), reject an `rgb()` component outside 0-255 with the same `Error` shape the unrecognised-color branch already uses at `:127`.
3. In `main` (`:173`), validate that each record's `fg` and `bg` are non-empty strings before pushing the pair (`:194`), throwing `ValueError` like the neighbouring unknown-type check at `:191`.
4. Wrap BOTH the `--json` record loop (`:185-195`) and the `parseColor` calls in the print loop (`:209`) in a `try` that catches `ValueError` and colour-parse `Error`, printing the message plus `DOC` and returning 2 - the CLI branch's existing contract at `:197-205`. The `--json` branch is deliberately uncaught today (`:184`) and `:228` is a bare `process.exitCode = main(...)`, so a throw there escapes the function instead of becoming a return code; the catch must cover it or step 1's test (c) cannot pass. Exit 1 then means exactly one thing: a pair failed its AA threshold.
5. VERIFY-GREEN, then update the `Contrast` bullet under `## Final QA` in `pro-designer/SKILL.md`. Its closing clause currently reads "exit 1 means a pair failed the AA threshold for its own type" - true only after this task; state both codes, 1 for an AA failure and 2 for bad input or usage. In the same bullet, make the command template lead with the resolved command rather than a literal `node`, which its own parenthetical already tells the reader to resolve via `check_node.sh`.

### Edge cases
- `#fff` and `#ffffff` shorthand parsing must not regress; the range check applies to the `rgb()` branch only.
- A JSON record with a mistyped key (`foreground` instead of `fg`) hits the same non-empty-string check and returns 2 with a readable message rather than a stack trace.
- A mixed run where one pair fails AA and a later pair is malformed returns 2 - input errors outrank a threshold result.

### Contracts
`parseColor(input) -> [r,g,b]` throws on out-of-range input. `main(argv) -> number` returns 0 clean, 1 AA failure, 2 usage or bad input.

### DoD
The suite is green, and no input produces a contrast ratio above the WCAG ceiling of 21:1 reported as `PASS`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - fix(superui): state the real fragment schema in the foundation-analyst prompt
- Covers: criteria #8
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/agents/foundation-analyst.md (`## Output - one fragment`)
- modify - superui/scripts/build_registry.ts (header comment block, `validateShape` doc comment - comment text only, no code)
- modify - superui/scripts/validate_bundle.ts (header comment block - comment text only, no code)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts` - exit 2 with usage (proves the comment edit did not break parsing)

*Tests*
- `grep -rl "Task 2" superui/` - expect no output at all (four sites match today)
- `grep -c "primitive" superui/agents/foundation-analyst.md` - expect at least 1
- `grep -c "lineHeight" superui/agents/foundation-analyst.md` - expect at least 1

### Approach
1. Replace the "in the Task 2 fragment shape" pointer at `foundation-analyst.md:54` with the fragment shape spelled out inline - there is no Task 2 document anywhere in the plugin.
2. Add the five fields `build_registry.ts` requires and the prompt currently omits, each as a bullet, no table, per `.claude/rules/_skills.md`: every token needs `type`; a `section: "3.2"` token additionally needs `primitive` and `usedFor`; every `accentUsage[]` entry needs `token` alongside `screen` and `where`; every `unknowns[]` entry needs `section` alongside `what` and `reason`; every `textStyles[]` entry needs `lineHeight`, `letterSpacing` and `usedFor` alongside `name`, `family`, `size` and `weight`. Mirror the wording `agents/design-synthesizer.md:54,61-68` already uses for the same contract.
3. Keep the existing dotted-name, `evidence` and re-dispatch bullets as they are - they are correct.
4. Note in the same section that `unknowns[].section` uses the section id the gap belongs to, since the current prompt describes the entry as "what and why" only (`:42`).
5. Retire the same phantom pointer from the three script comments that keep it alive - `build_registry.ts:10` ("see the Task 2 Contracts block"), `build_registry.ts:335` ("the Task 2 fragment contract") and `validate_bundle.ts:3` ("Task 2's merged token/style namespace"). Comment text only; touch no code. Both files are also edited by Tasks 3 and 6, which change function bodies rather than header comments.

### Edge cases
- Do not add an `evidence` requirement to textStyles - the field does not exist in their schema.
- Section ids the prompt already states (3.3/3.4 field-backed, no 3.10 token, 3.1/3.2/3.5-3.9 token-legal) match `section-model.ts` exactly and must not be restated or altered.
- Keep the section short: this is a worker prompt, and `.claude/rules/_skills.md` requires deltas over completeness.

### Contracts
Consumes nothing new. Produces a fragment `{foundation, tokens, surfaceOrder, accentUsage, textStyles, unknowns}` that satisfies `validateShape` on the first attempt.

### DoD
A colors fragment written strictly from this prompt merges through `build_registry.ts` with exit 0 on the first run, with no re-dispatch round consumed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - fix(superui): reset the whole run dir so a re-run cannot ship stale specs
- Covers: criteria #9
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/design-extractor/SKILL.md (`## Step 1 - Intake and gate`, items 4-6)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -n "rm -rf" superui/skills/design-extractor/SKILL.md` - the single hit targets `<run>`, not `<out>`
- `grep -c "every later step assumes an empty output tree" superui/skills/design-extractor/SKILL.md` - expect 1 (wording preserved, target changed)

### Approach
1. Change step 1.4 (`design-extractor/SKILL.md:42-43`) to `rm -rf <run>` instead of `rm -rf <out>`: `<run>` holds only regenerable scratch (`notes/`, `specs/`, `registry.json`, `inventory.md`, `source-map.md`, `intake-answers.md`) and `<out>` nests inside it, so one reset clears both.
2. Reword the trigger condition, which currently keys on `<out>` already existing, to key on `<run>` already existing - the same "previous run on this same source" case, since `<run-slug>` is the source directory's basename.
3. Keep step 1.5's `mkdir -p <out>` exactly as it is - it still creates both levels in one call.
4. Adjust step 1.6's gate report so it names the removed `<run>`, not a stale `<out>`.

### Edge cases
- The reset must stay in step 1, before `source-scout` writes `<run>/source-map.md` in step 2 - moving it later would delete that step's own output.
- `design-extractor-builder` step 5's `mkdir -p <run>/specs/...` must keep working against a freshly cleared `<run>`; it does, since `mkdir -p` creates the parents.
- A first run on a new source dir has no `<run>` to remove - the branch must stay conditional.

### Contracts
`<run>` = `.temp/design-extractor/<run-slug>/`, `<out>` = `<run>/handoff/` - unchanged. New invariant: `<run>` holds nothing older than the current run.

### DoD
Two consecutive runs on the same source directory, with an inventory entry renamed between them, ship a `DESIGN.components.md` whose `## <slug>` sections match the current `inventory.md` exactly.

<!-- /TASK -->

---

<!-- TASK -->

## Task 10 - fix(superui): connect the spec-writer NEEDS-INPUT channel to the builder return
- Covers: criteria #10
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/agents/spec-writer.md (`## Output`)
- modify - superui/skills/design-extractor-builder/SKILL.md (steps 2 and 5, `## Return`)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "NEEDS-INPUT" superui/skills/design-extractor-builder/SKILL.md` - expect at least 2 (steps 2 and 5 now collect it; today 0)
- `grep -c "NEEDS-INPUT: <count>" superui/agents/spec-writer.md` - expect 0

### Approach
1. In `spec-writer.md:54`, change the return channel from `NEEDS-INPUT: <count>` to a `NEEDS-INPUT:` block carrying the marker lines verbatim, one per line, or `NEEDS-INPUT: none` - the same block shape the neighbouring `MISSING-TOKENS:` channel already uses, so the two read alike.
2. In `design-extractor-builder/SKILL.md` step 5 (`:88-89`), extend the collect line to gather every `NEEDS-INPUT:` block alongside the `MISSING-TOKENS:` blocks it already collects, skipping entries reporting `none`.
3. In step 2 (`:63-70`), add the matching collect instruction for the `> NEEDS INPUT: <what>` marker `agents/foundation-analyst.md:43` carries in its final message - the item is already in the builder's context, only the instruction to keep it is missing.
4. In `## Return` (`:140-141`), scope the "minus every one step 7 resolved" subtraction to registry `unknowns` only: `build_registry.ts:459` matches a `resolved` entry to an `unknowns` entry by section plus `what`, which can never match a spec-inline or message-borne marker.
5. Fix the step 7 wording at `:111`, which says to record counts "from the analyst's final message" when step 7's agent is the `design-synthesizer`.

### Edge cases
- A spec-writer with no gaps returns `NEEDS-INPUT: none` and must contribute nothing to the return.
- The markers also survive inline in `DESIGN.components.md`; that stays true and is not a substitute for the summary.
- Steps 2, 5 and 6 can each contribute markers - the return must not drop one source while relaying another.

### Contracts
`spec-writer` final message: spec path, a `MISSING-TOKENS:` block or `none`, and a `NEEDS-INPUT:` block or `none`. The builder's return relays every standing item as text, never a count.

### DoD
A run in which a spec-writer records an unmeasurable component state surfaces that state in the user-facing final report, not only buried inside the satellite.

<!-- /TASK -->

---

<!-- TASK -->

## Task 11 - fix(superui): correct the reviewer-gate rationale and the stale measurement claim
- Covers: criteria #11
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/design-extractor-builder/SKILL.md (`## Ground rules`, the `bundle-reviewer` bullet)
- modify - superui/agents/bundle-reviewer.md (the "every value came from a deterministic script" claim)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "an input this skill receives rather than authors" superui/skills/design-extractor-builder/SKILL.md` - expect 0 (the false clause wraps across lines 42-43, so match the single-line half of it, not the wrapped phrase)
- `grep -c "sample_colors.ts.*measure_geometry.ts" superui/agents/bundle-reviewer.md` - expect 0

### Approach
1. Rewrite the `bundle-reviewer` bullet at `design-extractor-builder/SKILL.md:42-44`. Its current justification - that `dedup` and `accent-sprawl` trace back to the inventory - is false for `accent-sprawl`: that check reads `registry.json`'s `accentUsage` (`agents/bundle-reviewer.md:19`), a field the colors analyst this same skill dispatches at step 2 authors, and `build_registry.ts` never reads `inventory.md` at all. State the true reason instead: reviewer findings are judgment calls over a finished bundle, not structural defects, so they are carried verbatim for the user rather than re-dispatched.
2. Make that carve-out explicit against the re-dispatch convention directly above it at `:35-41`, so a `state-form` finding - literally "a malformed spec output" under that convention - has one unambiguous handling rule.
3. In `agents/bundle-reviewer.md:28`, drop the claim that every bundle value came from a deterministic script. It stopped being true when `design-synthesizer` introduced `proposed: true` values; replace it with the actual invariant from `superui/CLAUDE.md`: a measured value traces to a pixel sample, a proposed value carries a `Source: proposed` marker.

### Edge cases
- The operative directive "never a gate" is correct and must survive the rewrite - only its stated reason is wrong.
- `bundle-reviewer`'s four judgment categories stay exactly complementary to `validate_bundle.ts`'s four structural ones; do not move a check between them.
- Task 5 makes the `Source: proposed` marker true for section 3.10 as well, so the replacement wording is accurate once both land.

### Contracts
No interface change - both files are prompts. The reviewer's `FINDING: <category> <detail>` / `CLEAN` wire format is untouched.

### DoD
Every reason `design-extractor-builder/SKILL.md` states for its handling of reviewer findings is verifiable against the agents and scripts it dispatches.

<!-- /TASK -->

---

<!-- TASK -->

## Task 12 - fix(superui): anchor the contrast-gate path in the accessibility reference
- Covers: criteria #12
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/pro-designer/references/accessibility.md (the contrast-gate bullet)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "in this skill" superui/skills/pro-designer/references/accessibility.md` - expect 0
- `grep -c "CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" superui/skills/pro-designer/references/accessibility.md` - expect 1

### Approach
1. In `accessibility.md:61`, replace the bare relative `scripts/check_contrast.ts` with `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts"`, matching how `pro-designer/SKILL.md:23,54` already addresses it. `pro-designer` runs inside arbitrary host projects, so a bare relative path resolves against the host's cwd.
2. Delete the "(in this skill)" parenthetical: the script sits at the plugin root, and `skills/pro-designer/` holds only `SKILL.md` and `references/`. It was true before commit `887b678` moved the script and is now false.

### Edge cases
- Keep the bullet's substance - running the gate on every foreground/background pair - untouched; only the path is wrong.
- Do not import `SKILL.md`'s NODE_MISSING skip protocol or its runtime-resolution parenthetical into the reference; the entry point already carries both and `.claude/rules/_skills.md` forbids the duplication.
- This line is the only defect in the whole `pro-designer` reference cluster: the routing table, all 15 inter-reference pointers and every numeric claim were verified consistent. Change nothing else here.

### Contracts
No interface change. The documented invocation now matches the one `pro-designer/SKILL.md` executes.

### DoD
Every path this reference tells a model to run resolves to a real file when `pro-designer` runs in a host project other than this repo.

<!-- /TASK -->

---

<!-- TASK -->

## Task 13 - docs(superui): correct the agent topology and self-contradictions in superui/CLAUDE.md
- Covers: criteria #13
- TDD: none

### Dependencies
- none - blocks: Task 14

### Files
- modify - superui/CLAUDE.md (intro paragraph, `## Layout (superui internals)`, the `setup` and `design-extractor` skill bullets, `## Agents (design-extractor-builder workers)`)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "PASS/FAIL lines with install hints" superui/CLAUDE.md` - expect 0
- `grep -c "for everything else" superui/CLAUDE.md` - expect 0
- `grep -c "measuring: source-scout" superui/CLAUDE.md` - expect 0

### Approach
1. Correct the ownership split in all five places that state it: the intro paragraph's "the six agents `design-extractor` dispatches through its builder", the `agents/` line in `## Layout`, the `design-extractor` bullet's "dispatches `design-extractor-builder` for everything else", the `design-extractor-builder` bullet's "fans out to the agents below", and the `## Agents (design-extractor-builder workers)` heading. The head skill dispatches `source-scout` (step 2) and `component-scout` (step 4) itself; the builder dispatches the other four.
2. Resolve the `source-scout` contradiction: `## Layout` classifies it as measuring while its own bullet says it measures nothing, and its frontmatter carries no `Bash`. Only `foundation-analyst` and `spec-writer` can run a measuring script - reclassify accordingly.
3. Correct the `setup` bullet: `check_env.sh` emits `NODE <cmd>|MISSING` and `VERSION <v>`, not "PASS/FAIL lines with install hints". The PASS/FAIL table lives in `skills/setup/SKILL.md`, and this file already describes the script correctly in its `## Scripts inventory` entry - align the two.
4. Leave `.claude-plugin/plugin.json` alone: its `agents[]` correctly lists six, verified against disk.

### Edge cases
- This file is dev-time orientation and never a plugin runtime input; the fix targets editor accuracy, not behavior.
- The `## Scripts inventory` section is accurate throughout and must not be rewritten.
- Keep the file's existing voice and structure - this is a correction pass, not a rewrite.

### Contracts
No interface change.

### DoD
Every claim in `superui/CLAUDE.md` about which component dispatches which agent, and about what `check_env.sh` prints, matches the shipped files.

<!-- /TASK -->

---

<!-- TASK -->

## Task 14 - docs: correct the stale superui claims in the repo-root docs
- Covers: criteria #14
- TDD: none

### Dependencies
- Task 13 - blocks: nothing

### Files
- modify - README.md (the `pro-designer` table row, the superui pipeline paragraph)
- modify - CLAUDE.md (the plugin-layout sentence, the self-documentation invariant, the no-build/test/lint claim, the top-level layout tree)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "five agents" README.md` - expect 0
- `grep -c "60-30-10" README.md` - expect 0
- `grep -n "five" CLAUDE.md` - expect no hit describing a superui agent count (lines 67 and 197 today)
- `grep -c "design-synthesizer" README.md` - expect at least 1 (the omitted sixth role is now listed)
- `grep -c "build / test / lint at any level" CLAUDE.md` - expect 0 (the claim wraps across lines 71-72, so match the single-line half; the full sentence never appears on one line and would grep to 0 either way)
- `grep -c "^tests/" CLAUDE.md` - expect 1 (the layout tree now lists it)

### Approach
1. In `README.md:72-73`, correct "fans out to five agents" - there are six, and two of them (`source-scout`, `component-scout`) are dispatched by `design-extractor` itself, not by the builder. Add the missing `design-synthesizer` role (proposed-token synthesis) to the enumerated list, and attribute the roles to the right dispatcher per Task 13.
2. In `README.md:66`, drop "60-30-10 color discipline" from the `pro-designer` row. The skill's own reference opens with "Do not default to a 60-30-10 split for product UI" (`superui/skills/pro-designer/references/color.md:7`), so the row markets the skill by the exact heuristic it rejects. Use plain "color discipline", matching `superui/README.md:25`.
3. In the same row, correct "bundles topic reference docs + a WCAG contrast script": `skills/pro-designer/` bundles `references/` only; the contrast script lives at the plugin root and is shared.
4. In `CLAUDE.md:67` and `CLAUDE.md:197`, correct "five agents" and "superui's five `design-extractor-builder` workers" to six. `:197` sits inside the self-documentation invariant that tells editors to keep `agents[]` in sync, so a wrong count there is the most load-bearing instance.
5. Reconcile the same file with the `tests/` tree Tasks 1-7 introduce, or this plan ships the very defect class it is closing. The claim "there is no build / test / lint at any level" (wrapping across `CLAUDE.md:71-72`) becomes false: narrow it to what stays true - no build step and no lint, and no test tooling inside any plugin - while naming the repo-root `tests/` suites run with `node --test`. Add a `tests/` row to the top-level layout tree (near `.claude/rules/` at `:108`), stating that it holds dev-time regression suites for plugin scripts and ships with no plugin.

### Edge cases
- `superui/README.md` is already correct on all three points and must not be touched.
- The `tests/` tree sits outside every plugin dir, so no `plugin.json` and no marketplace entry changes - the layout note must say so explicitly.
- Root `CLAUDE.md` and root `README.md` never reach the plugins at runtime; this is published-accuracy work, and `README.md` is the user-facing one.
- Keep the existing table structure in `README.md` - it is a catalog, not skill prose, so the no-tables rule in `.claude/rules/_skills.md` does not apply here.

### Contracts
No interface change.

### DoD
No repo-root document states an agent count or a pipeline ownership that contradicts `superui/.claude-plugin/plugin.json` and the two pipeline SKILL.md files, and none advertises a heuristic the skill argues against.

<!-- /TASK -->
