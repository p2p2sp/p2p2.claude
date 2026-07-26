
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


### Covered criteria
3. A `textStyles[]` entry or token that reaches the registry without `proposed: true` inside a `foundation: "proposed"` fragment is rejected, and a fragment's `resolved` list no longer clears an `unknowns` entry when the fragment flags nothing proposed.
