
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


### Covered criteria
6. `validate_bundle.ts` emits a `missing-screen` finding for an absent `canonical:` filename containing spaces, and emits none when that file is present in `screens/`.
7. `validate_bundle.ts`, `render_design_md.ts`, and `copy_screens.ts` all parse `canonical:` lines and `·`-delimited inventory entries through `superui/scripts/inventory-format.ts`.
