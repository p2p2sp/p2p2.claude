
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


### Covered criteria
1. Each of `measure_geometry.ts`, `build_registry.ts`, `render_design_md.ts`, `validate_bundle.ts`, `check_contrast.ts` can be imported from a test file without executing its CLI, and each still runs unchanged from the command line.
