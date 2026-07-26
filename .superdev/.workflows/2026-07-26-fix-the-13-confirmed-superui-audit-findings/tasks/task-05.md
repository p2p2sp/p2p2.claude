
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


### Covered criteria
5. Section 3.10 renders a proposed dark value distinguishably from a measured one.
