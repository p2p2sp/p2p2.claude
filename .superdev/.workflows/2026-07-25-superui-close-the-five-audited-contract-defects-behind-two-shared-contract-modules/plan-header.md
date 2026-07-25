Title: "superui - close the five audited contract defects behind two shared contract modules"


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

