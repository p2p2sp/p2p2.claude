
## Task 3 - feat(superui): add design and platform validation modes to validate_bundle.ts
- Covers: criteria #3, #10
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/validate_bundle.ts (main, checkScreenRefs, checkSections, usageText, header comment)
- modify - superui/scripts/inventory-format.ts (canonicalRefs)
- modify - tests/superui/validate_bundle.test.ts
- modify - tests/superui/inventory-format.test.ts

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/superui/validate_bundle.test.ts"`
- `node --test "tests/superui/inventory-format.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task.
2. Add a required `--mode design|platform` flag to `main`. `design`: run `checkSections` + `checkForbidden` only (BUNDLE_DIR holds just `DESIGN.md`; REGISTRY_JSON stays a required arg for CLI uniformity but token refs are not checked). `platform`: run `checkTokenRefs` + `checkScreenRefs` + `checkEffectLines` + `checkForbidden`, skipping `checkSections` (no `DESIGN.md` in a platform dir). No flag -> exit 2 usage error.
3. In `canonicalRefs` (`inventory-format.ts`), drop refs whose filename is the literal `none` so an invented spec's `canonical: none` produces no `missing-screen` finding and no copy attempt in `copy_screens.ts` (shared consumer). Update `inventory-format.ts`'s header comment: document the `none` rule and drop `render_design_md.ts` from its importer list (Task 2 removes that import).
4. Update header comments and tests: mode-selection cases, a platform-dir fixture without `DESIGN.md` staying clean, a `canonical: none` satellite case, and existing fixtures switched to explicit modes.

### Edge cases
- `--mode design` on a dir that also holds satellites -> satellites are simply not checked (no finding).
- `--mode platform` with an entirely empty satellite stub ("None catalogued.") -> zero findings (existing fail-open behavior preserved).
- Unknown `--mode` value -> exit 2.

### Contracts
- Changed CLI: `validate_bundle.ts BUNDLE_DIR REGISTRY_JSON --mode design|platform`. Callers are the two builder skills (updated in Tasks 7 and 8).
- `canonicalRefs` contract change: literal `none` is never a reference (documented in `inventory-format.ts` header).

### DoD
Both modes behave per criteria #3; all listed test commands green.


### Covered criteria
3. `superui/scripts/validate_bundle.ts` supports `--mode design` (validates `DESIGN.md` only: sections + forbidden artifacts) and `--mode platform` (validates satellites + `screens/` against a registry JSON: token refs, screen refs, effect lines, forbidden artifacts - no `DESIGN.md` section check), and a `canonical: none` line yields no `missing-screen` finding.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.
