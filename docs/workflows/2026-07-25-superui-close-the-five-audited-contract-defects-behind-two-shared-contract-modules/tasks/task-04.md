
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


### Covered criteria
7. `validate_bundle.ts`, `render_design_md.ts`, and `copy_screens.ts` all parse `canonical:` lines and `·`-delimited inventory entries through `superui/scripts/inventory-format.ts`.
8. `copy_screens.ts` copies every deduplicated canonical screen present in the source dir into `<out>/screens/`, skips absent ones with exit 0, and step 8 of `design-extractor-builder/SKILL.md` invokes it as a script step.
