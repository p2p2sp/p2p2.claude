
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


### Covered criteria
6. A `canonical:` line carrying leading markdown decoration is parsed as a screen reference, and a bundle whose non-empty satellites cite zero canonical screens yields a finding instead of `CLEAN`.
