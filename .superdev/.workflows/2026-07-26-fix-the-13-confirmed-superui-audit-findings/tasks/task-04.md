
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


### Covered criteria
4. A `usedFor` value containing `|` or a newline renders as exactly one table cell in sections 3.2 and 3.5, and a measured `notes` value on a 3.2 token renders even when no 3.2 row is proposed.
