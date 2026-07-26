# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui - close the five audited contract defects behind two shared contract modules"

---
<!-- HEADER -->

## Goal
The superui design-extraction pipeline no longer silently loses or corrupts data between stages: a token in a field-backed section is rejected at the registry instead of vanishing from `DESIGN.md`, a duplicate name in any merged namespace aborts the merge instead of shipping a duplicate YAML key, the canonical-screen gate fires on filenames with spaces, and satellite outlines survive any spec heading level. The section model and the inventory line format each live in exactly one module that every consumer imports, so the class of drift that produced these defects cannot recur silently.

## Context
A `superfix:code-auditor` run over `superui/` (`.temp/code-reviewer/2026-07-25-superui/findings.md`) confirmed five defects, each replayed by an independent critic on a clean worktree. The two most severe are not defects of any single file - they are mismatches between what one script accepts and what the next one reads, which is why per-file review never caught them: the canonical 3.x section list exists exactly once, unexported, in `render_design_md.ts`, while `build_registry.ts` knows it only as two regexes, and both files' header comments point at contract documents that do not exist in the repo. This plan fixes the five defects and removes the split that caused two of them.

This repo has no build, test, or lint at any level - editing TypeScript and markdown IS shipping. Every task is therefore verified by running the real script on a fixture under `.temp/superui-fix/` and reading its stdout and exit code; that is the only verification mechanism available, and it is why every task carries `TDD: none` (a red-green cycle needs a runner this repo does not have, and every deliverable here is a filesystem-facing CLI).

One verification note: `superui/scripts/build_registry.ts` currently holds a literal NUL byte at offset 17525, inside `unknownKey`. Ripgrep therefore classifies the file as binary and suppresses its content output, and because the NUL terminates the line for rg, any pattern spanning it never matches at all. Counts still work, so the practical effect is that symbols in this file must be confirmed with Read rather than by reading Grep output, until Task 1 replaces that byte with the `\x00` escape. Confirmed present by Read at the line ranges cited: `TokenEntry` (:70), `TextStyleEntry` (:96), `NamedFragment` (:132), `Collision` (:137), `ShapeError` (:146), `TOKEN_SECTION_RE` (:151), `UNKNOWN_SECTION_RE` (:152), `validateToken` (:166), `detectCollisions` (:361), `unknownKey` (:378), `mergeFragments` (:387).

Two conventions for every task below. Test commands are written with a bare `node`; on Node 22.6-23.5 substitute the `check_node.sh`-resolved `node --experimental-strip-types`, which is how `superui/CLAUDE.md` documents the runtime. Every fixture path named as an INPUT_DIR is a **directory** holding one or more `notes-*.json` fragments, since `build_registry.ts` selects its inputs with `readdirSync(inputDir)` filtered on `/^notes-.*\.json$/`. No task lists its fixtures under `### Files`: each task's first implementation act is to build the fixtures its own test commands name, under `.temp/superui-fix/<task>/`, taking every shape from the header contract of the script under test - the fragment shape from `build_registry.ts`, the bundle layout from `validate_bundle.ts`, the spec layout from `assemble_specs.ts`.

## Acceptance criteria
1. `build_registry.ts` exits 1 naming the token and its section when a fragment carries a token with `section: "3.3"` or `"3.4"`; tokens in 3.1, 3.2, 3.5-3.9 still merge.
2. `build_registry.ts` and `render_design_md.ts` both take the section list from `superui/scripts/section-model.ts`; neither declares its own list of section ids.
3. `superui/scripts/build_registry.ts` contains no NUL byte, so ripgrep reads it as text.
4. `build_registry.ts` exits 1 naming both source fragments when two fragments declare the same `textStyles[].name`, the same `surfaceOrder[].region`, or the same `accentUsage` screen+where+token triple.
5. `build_registry.ts` exits 1 when a single fragment's `textStyles`, `surfaceOrder`, or `accentUsage` array declares the same key twice.
6. `validate_bundle.ts` emits a `missing-screen` finding for an absent `canonical:` filename containing spaces, and emits none when that file is present in `screens/`.
7. `validate_bundle.ts`, `render_design_md.ts`, and `copy_screens.ts` all parse `canonical:` lines and `·`-delimited inventory entries through `superui/scripts/inventory-format.ts`.
8. `copy_screens.ts` copies every deduplicated canonical screen present in the source dir into `<out>/screens/`, skips absent ones with exit 0, and step 8 of `design-extractor-builder/SKILL.md` invokes it as a script step.
9. A spec body opening with `# Title` assembles into a satellite whose only `## ` headings are the slug wrappers, with the spec's own headings ranked below them, and a `## ` line inside a fenced code block is left unmodified.
10. `assemble_specs.ts` exits 1 with the documented `error:` message shape when a slug wrapper is absent from the written file, when the specs dir is unreadable, and when the output cannot be written.
11. `spec-writer.md` pins the spec heading floor at `##` and its Output section carries a `> NEEDS INPUT` clause.
12. `superui/CLAUDE.md` documents the three new scripts and the scripted step 8, and no longer states that `vendor/` is the only relative-import target.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - fix(superui): reject tokens in the field-backed sections 3.3 and 3.4
- Covers: criteria #1, #2, #3
- TDD: none

### Dependencies
- none

### Files
- add - superui/scripts/section-model.ts (SECTION_IDS, SECTION_TITLES, TOKEN_BACKED_SECTIONS, isTokenSection, TOKEN_SECTION_RE, UNKNOWN_SECTION_RE)
- modify - superui/scripts/build_registry.ts (TOKEN_SECTION_RE, UNKNOWN_SECTION_RE, validateToken, unknownKey)
- modify - superui/scripts/render_design_md.ts (SECTION_TITLES)
- modify - superui/agents/foundation-analyst.md (Duty split, Colors - mandatory coverage, Hard rules)
- modify - superui/agents/design-synthesizer.md (Coherence and collision rules, Output - one fragment)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts -h` - prints the usage line, exit 0 (a broken import or parse error fails here)
- `node superui/scripts/render_design_md.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-bad33 .temp/superui-fix/t1/out.json` - exit 1, stderr names the token and section 3.3
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-bad34 .temp/superui-fix/t1/out.json` - exit 1, stderr names section 3.4
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-good .temp/superui-fix/t1/out.json` - exit 0, prints `REGISTRY_OK tokens=<N> unknowns=<M> -> ...`
- `node superui/scripts/render_design_md.ts .temp/superui-fix/t1/out.json .temp/superui-fix/t1/inventory.md .temp/superui-fix/t1/DESIGN.md` - exit 0, the six emitted `### 3.N` headings (3.1, 3.2, 3.3, 3.4, 3.8, 3.10) keep their current titles; 3.5, 3.6, 3.7 and 3.9 render through `renderSubsectionBody` with no `### 3.N` heading, and `SECTION_TITLES` still holds all ten entries
- `rg -c '\\x00' superui/scripts/build_registry.ts` - returns 1 after the fix and 0 before it, since the separator is now the two-character escape rather than a raw byte. A pattern like `TOKEN_SECTION_RE` does not discriminate: both its occurrences sit before the NUL and already match today.

### Approach
1. Create `section-model.ts` exporting `SECTION_IDS` (`"3.1"`..`"3.10"` in order), `SECTION_TITLES: Record<string, string>` carrying the ten titles currently in `render_design_md.ts`, `TOKEN_BACKED_SECTIONS` (3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.9 - excluding the field-backed 3.3/3.4 and the derived 3.10), `isTokenSection(id: string): boolean`, and `TOKEN_SECTION_RE` / `UNKNOWN_SECTION_RE` built from those sets rather than written as literals. Header comment states the three provenance classes and that a section absent from `TOKEN_BACKED_SECTIONS` has no renderer for tokens.
2. In `build_registry.ts`, delete the local `TOKEN_SECTION_RE` and `UNKNOWN_SECTION_RE` declarations and import both from `./section-model.ts`; extend `validateToken`'s section `ShapeError` message to name the field that does cover the section (`surfaceOrder` for 3.3, `accentUsage` for 3.4) so the agent gets a corrective instruction, not just a rejection.
3. In `build_registry.ts`, replace the literal NUL byte separator inside `unknownKey` with the two-character escape `\x00` so the source is pure ASCII and the runtime key is unchanged.
4. In `render_design_md.ts`, delete the local `SECTION_TITLES` object and import it from `./section-model.ts`, leaving every renderer and `renderBody`'s dispatch untouched.
5. In `foundation-analyst.md`, rewrite the `colors` duty-split line so 3.3 and 3.4 are named as covered exclusively via `surfaceOrder` / `accentUsage` and never by a token, phrased in the same shape as the existing 3.10 exclusion; add to Hard rules that `surfaceOrder` and `accentUsage` belong to the colors analyst alone.
6. In `design-synthesizer.md`, narrow the token `section` range in the Output section from `3.1`..`3.9` to `3.1`, `3.2`, `3.5`-`3.9`, since after step 2 the two excluded ids are rejected at the registry; and state that a proposal touching accent usage is a semantic token in 3.2, never an `accentUsage` entry.

### Edge cases
- A fragment carrying a token in 3.10 must keep failing with the existing message - the new 3.3/3.4 rejection must not replace that path.
- An `unknowns` entry in 3.3, 3.4, or 3.10 stays legal: only `TOKEN_SECTION_RE` narrows, `UNKNOWN_SECTION_RE` keeps accepting 3.1-3.10.
- A `resolved` entry is validated by the same routine as `unknowns` and must keep accepting 3.10.

### Contracts
- `section-model.ts` exports `SECTION_IDS: string[]`, `SECTION_TITLES: Record<string, string>`, `TOKEN_BACKED_SECTIONS: ReadonlySet<string>`, `isTokenSection(id: string): boolean`, `TOKEN_SECTION_RE: RegExp`, `UNKNOWN_SECTION_RE: RegExp`.
- Consumes the existing `notes-<foundation>.json` fragment shape `{ foundation, tokens, surfaceOrder, accentUsage, textStyles, unknowns, resolved }` unchanged.

### DoD
All Task 1 test commands produce the stated exit codes and output, `DESIGN.md` renders with its ten subsection titles unchanged from before the task, and `rg` reads `build_registry.ts` as text.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - fix(superui): widen the collision gate to every merged namespace
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 1 - blocks: both tasks edit `build_registry.ts`; Task 1's NUL fix also makes the file greppable for this task's verification

### Files
- modify - superui/scripts/build_registry.ts (detectCollisions, mergeFragments, Collision)
- modify - superui/agents/design-synthesizer.md (Coherence and collision rules)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-textstyle .temp/superui-fix/t2/out.json` - exit 1, stderr names `text.body` and both fragment filenames
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-surface .temp/superui-fix/t2/out.json` - exit 1, stderr names the duplicated region
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-accent .temp/superui-fix/t2/out.json` - exit 1, stderr names the duplicated accentUsage triple
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-within .temp/superui-fix/t2/out.json` - exit 1 for a single fragment declaring `text.body` twice in its own `textStyles` array
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-clean .temp/superui-fix/t2/out.json` - exit 0, `REGISTRY_OK` line

### Approach
1. Generalise `Collision` from a token-only shape to `{ namespace: string; key: string; fragments: string[] }` and update the CLI's collision reporting to print the namespace alongside the key, keeping the existing one-line-per-collision format and exit 1.
2. Rewrite `detectCollisions` to walk four namespaces per fragment: `tokens` keys, `textStyles[].name`, `surfaceOrder[].region`, and `accentUsage` keyed on the `screen`+`where`+`token` triple. Keep one `Map<string, string>` per namespace so a name may legitimately repeat across namespaces.
3. In the same pass, detect within-fragment duplicates for the three array namespaces by checking each array against a per-fragment set before merging it into the cross-fragment map; report them with both `fragments` entries set to the same filename.
4. Correct the `detectCollisions` docstring and both stale header-comment claims: that a same-fragment duplicate is unobservable after `JSON.parse` (true for `tokens{}`, false for the three arrays, which survive parsing intact), and the header's description of the collision exit as token-name-only, which now covers four namespaces.
5. In `design-synthesizer.md`, widen the collision rule so "a duplicate name aborts the merge" is stated for every merged namespace rather than token names alone.

### Edge cases
- `surfaceOrder` and `accentUsage` are optional and default to `[]`; an absent field must not register as a collision.
- The same dotted name legitimately appearing as both a token key and an `accentUsage[].token` reference is not a collision - `accentUsage[].token` is a reference, and its referential check against merged tokens stays as it is.
- Two `accentUsage` entries sharing a screen but differing in `where` are distinct and must pass.

### Contracts
- `detectCollisions(fragments: NamedFragment[]): Collision[]` where `Collision = { namespace: string; key: string; fragments: string[] }`.
- `mergeFragments` keeps its current signature and concatenation order; only the pre-merge gate changes.

### DoD
All Task 2 test commands produce the stated exit codes, the four duplicate fixtures each fail with a message naming the namespace and key, and the clean fixture still merges.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - fix(superui): stop the canonical-screen gate failing open on spaced filenames
- Covers: criteria #6, #7
- TDD: none

### Dependencies
- Task 1 - blocks: both tasks edit `render_design_md.ts`

### Files
- add - superui/scripts/inventory-format.ts (INVENTORY_DELIMITER, CANONICAL_LINE_RE, canonicalRefs, parseInventoryEntries, InvEntry)
- modify - superui/scripts/validate_bundle.ts (CANONICAL_LINE_RE, checkScreenRefs)
- modify - superui/scripts/render_design_md.ts (inventoryEntries, fieldValue, InvEntry)

### Test Commands
*Build*
- `node superui/scripts/validate_bundle.ts -h` - prints the usage line, exit 0
- `node superui/scripts/render_design_md.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/validate_bundle.ts .temp/superui-fix/t3/out-missing .temp/superui-fix/t3/registry.json` - exit 1, a `FINDING: missing-screen` line naming the spaced filename
- `node superui/scripts/validate_bundle.ts .temp/superui-fix/t3/out-present .temp/superui-fix/t3/registry.json` - exit 0, prints `CLEAN`, where the only difference from the previous fixture is that the spaced screen exists in `screens/`
- `node superui/scripts/render_design_md.ts .temp/superui-fix/t3/registry.json .temp/superui-fix/t3/inventory.md .temp/superui-fix/t3/DESIGN.md` - exit 0, the Components overview lists every inventory entry with its slug and kind unchanged

### Approach
1. Create `inventory-format.ts` exporting `INVENTORY_DELIMITER` (the single U+00B7 character), `CANONICAL_LINE_RE` as `/^canonical:\s*(.+?)\s*$/gm` - which captures the whole line after the key, trimmed, because `\s*$` forces even a lazy `.+?` to expand to end of line - `canonicalRefs(content: string): string[]` returning deduplicated captures, and `parseInventoryEntries(inventoryMd: string, heading: string): InvEntry[]` holding the field-index logic currently in `render_design_md.ts`'s `inventoryEntries` (component: kind at index 1, canonical at index 2; pattern: canonical at index 1), moving its `InvEntry` interface and its `fieldValue` helper across with it. Header comment pins the delimiter as U+00B7 and states that the capture takes the whole trimmed remainder of the line, so a `canonical:` line carrying trailing commentary is reported as a missing screen rather than silently skipped.
2. In `validate_bundle.ts`, delete the local `CANONICAL_LINE_RE` and rewrite `checkScreenRefs` to build its `cited` set from `canonicalRefs`, leaving the finding text and the rest of the function unchanged.
3. In `render_design_md.ts`, delete `inventoryEntries` and import `parseInventoryEntries` in its place, keeping `InvEntry` field names so `renderBody` and the Components overview need no change.
4. Verify the probe set: `Screenshot 2026-07-25 at 14.32.10.png` and `Screenshot (1).png` now capture in full, `login.png   ` trims to `login.png`, and `login.png (canonical)` captures whole - a change from today's `(\S+)`, which silently dropped it. That last case is out of contract per `spec-writer.md`'s "the filename exactly as it appears in `screens/`", and surfacing it as a `missing-screen` finding is the intended fail-loud behaviour, not a regression.

### Edge cases
- A `canonical:` line with trailing whitespace must trim to the bare filename, not capture the spaces.
- A `canonical:` line carrying trailing commentary after the filename is out of contract; it now captures whole and surfaces as a `missing-screen` finding instead of being silently dropped, which is the intended fail-loud behaviour.
- A filename containing the U+00B7 delimiter itself is out of contract for the inventory line and stays unhandled - the delimiter split is positional by design.
- An inventory entry missing its canonical field yields an empty canonical, exactly as the current `fields[n] ?? ""` fallback does.

### Contracts
- `inventory-format.ts` exports `INVENTORY_DELIMITER: string`, `CANONICAL_LINE_RE: RegExp`, `canonicalRefs(content: string): string[]`, `parseInventoryEntries(inventoryMd: string, heading: string): InvEntry[]`, `InvEntry = { slug: string; kind: string; canonical: string }`.
- The satellite `canonical: <filename>` line format and the `·`-delimited inventory line format are unchanged on disk; only their parsers move.

### DoD
All Task 3 test commands produce the stated exit codes, the present-vs-absent pair of bundles is now distinguishable where it previously returned `CLEAN` for both, and `DESIGN.md`'s Components overview is byte-identical to its pre-task output for the same inputs.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): make canonical-screen copying a deterministic script
- Covers: criteria #7, #8
- TDD: none

### Dependencies
- Task 3 - blocks: `copy_screens.ts` imports `inventory-format.ts`

### Files
- add - superui/scripts/copy_screens.ts (main, usageText, helpText, argError, exitErr)
- modify - superui/skills/design-extractor-builder/SKILL.md (step 8)

### Test Commands
*Build*
- `node superui/scripts/copy_screens.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/copy_screens.ts .temp/superui-fix/t4/inventory.md .temp/superui-fix/t4/source .temp/superui-fix/t4/out` - exit 0, prints `SCREENS_OK copied=<N> skipped=<M> -> .temp/superui-fix/t4/out/screens`
- `node superui/scripts/copy_screens.ts .temp/superui-fix/t4/inventory-spaced.md .temp/superui-fix/t4/source .temp/superui-fix/t4/out2` - exit 0, a filename containing spaces lands in `out2/screens/` under its exact original name
- `node superui/scripts/copy_screens.ts .temp/superui-fix/t4/inventory-absent.md .temp/superui-fix/t4/source .temp/superui-fix/t4/out3` - exit 0, the absent screen is counted in `skipped` and the run does not fail
- `node superui/scripts/copy_screens.ts .temp/superui-fix/t4/inventory.md .temp/superui-fix/t4/nosuchdir .temp/superui-fix/t4/out4` - exit 1, `error:` message naming the unreadable source dir

### Approach
1. Write `copy_screens.ts` with the CLI `copy_screens.ts [-h] INVENTORY_MD SOURCE_DIR OUT_DIR`, following the header-contract, `argError`/`exitErr`, and self-verify conventions already used by `assemble_specs.ts` and `validate_bundle.ts` - exit 0 on success, 1 on runtime error, 2 on usage error.
2. Collect canonical filenames by calling `parseInventoryEntries` for both `## Components` and `## Patterns`, take each entry's `canonical`, drop empties, and deduplicate preserving first-seen order.
3. `mkdirSync(join(outDir, "screens"), { recursive: true })`, then for each filename copy `join(sourceDir, name)` to `join(outDir, "screens", name)` when the source file exists, counting it; count a missing source as skipped without failing, matching the current step-8 contract that a filename absent from `source:` is skipped without error.
4. Self-verify by re-reading the screens dir and confirming every copied name is present, then print `SCREENS_OK copied=<N> skipped=<M> -> <screens-dir>`.
5. Rewrite step 8 of `design-extractor-builder/SKILL.md` from a `[you]` step to a `[script]` step invoking `<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/copy_screens.ts" <run>/inventory.md <source> <out>`, keeping the existing statement that a missing screen is not a failure here because `validate_bundle.ts` reports it in step 10.

### Edge cases
- A canonical filename that is an absolute path or contains a path separator must be rejected with an `error:` rather than written outside `<out>/screens/`.
- The same canonical filename cited by several inventory entries is copied once.
- An empty inventory yields `SCREENS_OK copied=0 skipped=0` and an existing empty `screens/` dir, exit 0.
- `OUT_DIR` already containing `screens/` from a prior run is reused, not an error.

### Contracts
- CLI `copy_screens.ts [-h] INVENTORY_MD SOURCE_DIR OUT_DIR`; stdout `SCREENS_OK copied=<N> skipped=<M> -> <path>`; exit 0 ok, 1 runtime, 2 usage.
- Consumes `parseInventoryEntries` from `inventory-format.ts`.

### DoD
All Task 4 test commands produce the stated exit codes and output, and step 8 of `design-extractor-builder/SKILL.md` names the script with the argument order the script actually parses.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - fix(superui): normalise spec heading levels when assembling satellites
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- none

### Files
- modify - superui/scripts/assemble_specs.ts (demoteBodyHeadings, main)
- modify - superui/agents/spec-writer.md (The spec file's machine-readable surface - pin exactly)

### Test Commands
*Build*
- `node superui/scripts/assemble_specs.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 .temp/superui-fix/t5/DESIGN.components.md` - exit 0, `SPECS_OK entries=2`, and `rg -n '^#{1,6} ' .temp/superui-fix/t5/DESIGN.components.md` shows the only `## ` lines are the two slug wrappers with every spec heading below them
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-fence .temp/superui-fix/t5/DESIGN.fence.md` - exit 0, the `## ` line inside the fenced block is unchanged in the output
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-deep .temp/superui-fix/t5/DESIGN.deep.md` - exit 0, an h6 heading in a spec body stays h6 rather than becoming h7
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 /dev/null` - exit 1, `error: self-verify failed` naming the missing wrapper (POSIX only; on Windows use `NUL` as the output path)
- `chmod 000 .temp/superui-fix/t5/specs-locked && node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-locked .temp/superui-fix/t5/out.md` - exit 1, `error: cannot read specs dir` with no `node:fs` stack frames. This must target an existing but unreadable dir: a nonexistent path is already caught by the `statSync` guard and would not exercise the `readdirSync` wrap at all. POSIX only.
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 .temp/superui-fix/t5/nodir/out.md` - exit 1, `error:` naming the unwritable output path, no stack frames

### Approach
1. Rewrite `demoteBodyHeadings` to map every ATX body heading of level `L` to `min(6, max(3, L + 1))`, and to skip lines inside fenced code regions by tracking ``` and ~~~ fence state while scanning line by line. The `max(3, ...)` floor is load-bearing: a plain `L + 1` would turn a body `# Title` into a second `## ` that is not a slug wrapper, recreating the very corruption this task removes. Both h1 and h2 therefore land on h3, h3-h5 shift down one, and h6 stays h6 so nothing becomes h7.
2. Have `demoteBodyHeadings` report whether any h1 was shifted, and in `main` print one non-fatal `warning:` line per spec file whose body carried an h1, naming the file - the run still exits 0.
3. Replace the self-verify's `## `-count check with a check that every expected slug wrapper heading is present in the re-read file, reporting the first missing slug in the existing `error: self-verify failed` message shape.
4. Wrap the `readdirSync` call and the `writeFileSync` call in try/catch blocks that route through `exitErr` so both emit the documented `error: cannot read specs dir '<dir>': <reason>` and `error: cannot write '<path>': <reason>` forms instead of a raw `node:fs` stack.
5. In `spec-writer.md`, pin the heading floor under the machine-readable-surface section: spec bodies start at `##` and never use a single `#`, because the assembler reserves h2 for the slug wrapper.
6. Correct the two now-false claims in `assemble_specs.ts`'s own header comment: that a body `## ` is demoted to `### ` - the rule is now h1 and h2 both to h3, h3-h5 down one, h6 clamped, fenced regions skipped - and that the self-verify asserts a `## `-count equal to the input file count, when it now asserts each slug wrapper is present.

### Edge cases
- An unterminated fenced block runs to end of file; every line after the opening fence stays unmodified.
- A fenced line that looks like a slug wrapper must not satisfy the self-verify: under a presence check the hazard inverts from over-counting to a genuinely missing wrapper reading as present, so the self-verify must skip fenced regions exactly as the demoter does.
- An empty specs dir keeps its current behaviour: the titled "None catalogued." stub at exit 0, with the self-verify expecting zero wrappers.
- A spec file whose body is empty still produces its slug wrapper.

### Contracts
- `demoteBodyHeadings(body: string): { text: string; shiftedH1: boolean }` - the return shape widens from a bare string; `main` is its only caller.
- The satellite's on-disk shape is unchanged: one `## <slug>` wrapper per spec, spec headings ranked strictly below it.

### DoD
All Task 5 test commands produce the stated exit codes and messages, the h1 fixture yields a satellite whose outline nests every spec heading under its own wrapper, and no failure path prints a `node:fs` stack frame.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - fix(superui): give spec-writer a channel for its NEEDS INPUT gaps
- Covers: criterion #11
- TDD: none

### Dependencies
- Task 5 - blocks: both tasks edit `spec-writer.md`

### Files
- modify - superui/agents/spec-writer.md (Output)

### Test Commands
*Build*
- none - markdown only, no script parses this file

*Tests*
- `rg -n 'NEEDS INPUT' superui/agents/spec-writer.md` - shows a match inside the `## Output` section, alongside the existing matches in the body and Hard rules
- `rg -n 'NEEDS INPUT' superui/agents/foundation-analyst.md` - confirms the sibling agent's existing marker clause under "The three exits for anything unmeasurable", which the new spec-writer wording mirrors

### Approach
1. Extend the `## Output` section so the final message ends with the spec path, the `MISSING-TOKENS:` block, and a count of the `> NEEDS INPUT` markers written inline in the spec, or `NEEDS-INPUT: none`, phrased in the same shape as `foundation-analyst.md`'s final-message clause.
2. Keep the Hard rules line stating that `> NEEDS INPUT:` inline is the only way to surface a gap in the artifact - the new clause reports the count, it does not move the marker out of the spec, which is where the consumer reads it.

### Edge cases
- A spec with no gaps reports `NEEDS-INPUT: none` rather than omitting the clause, so the builder can distinguish "no gaps" from "agent forgot".

### Contracts
- `spec-writer`'s final message gains a `NEEDS-INPUT: <count>` or `NEEDS-INPUT: none` clause; the spec file's inline `> NEEDS INPUT:` markers are unchanged.

### DoD
`spec-writer.md`'s Output section names the NEEDS-INPUT clause, and the inline-marker rule in Hard rules is still present and unmodified.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - docs(superui): align CLAUDE.md with the new scripts and scripted step 8
- Covers: criterion #12
- TDD: none

### Dependencies
- Task 1 - blocks: documents `section-model.ts`
- Task 3 - blocks: documents `inventory-format.ts`
- Task 4 - blocks: documents `copy_screens.ts` and the scripted step 8
- Task 5 - blocks: documents the changed `assemble_specs.ts` demotion rule

### Files
- modify - superui/CLAUDE.md (Scripts inventory, Skills (flat-named, single domain))

### Test Commands
*Build*
- none - markdown only

*Tests*
- `rg -n 'section-model|inventory-format|copy_screens' superui/CLAUDE.md` - three new script entries present
- `rg -n 'vendor/' superui/CLAUDE.md` - the relative-import sentence no longer claims `vendor/` is the only target
- `rg -n 'design-extractor-builder' superui/CLAUDE.md` - the step-8 description names the script rather than an inline copy

### Approach
1. Add three entries to the Scripts inventory: `section-model.ts` and `inventory-format.ts` as the two shared contract modules naming their consumers, and `copy_screens.ts` as the canonical-screen copier.
2. Rewrite the relative-import sentence so it names the two new intra-`scripts/` imports alongside the existing `vendor/` ones, since it currently asserts `vendor/` is the only relative-import target.
3. Update the `assemble_specs.ts` entry so the heading rule reads "h1 and h2 both to h3, h3-h5 down one, h6 clamped, fenced regions skipped", replacing the current "body `## ` headings demoted to `### `" wording.
4. Update the `design-extractor-builder` skill description so canonical-screen copying is listed among its scripted steps rather than work the orchestrator does itself.

### Edge cases
- none

### Contracts
- none - documentation only; `CLAUDE.md` is dev-time orientation and is never read at runtime by any skill.

### DoD
All Task 7 test commands return matches, and every script named in the Scripts inventory exists at the path given.

<!-- /TASK -->
