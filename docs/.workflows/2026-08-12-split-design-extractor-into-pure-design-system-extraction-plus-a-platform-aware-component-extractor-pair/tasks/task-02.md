
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


### Covered criteria
2. `superui/scripts/render_design_md.ts` renders `DESIGN.md` without an inventory argument (CLI `REGISTRY_JSON OUTPUT_MD [--source <label>]`), its Components section is fixed pointer boilerplate to per-platform satellites, and its post-front-matter note declares "reference px @1x" plus how to read shadow notation and map units per platform.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.
