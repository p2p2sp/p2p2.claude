
## Task 4 - feat(superui): gate component specs on explicit border, shadow and gradient lines
- Covers: criteria #5, #8
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/validate_bundle.ts (`FindingCategory`, new `checkEffectLines`, `main`, header comment)
- modify - tests/superui/validate_bundle.test.ts

### Test Commands
*Build*
- `node superui/scripts/validate_bundle.ts --help` - prints usage, exit 0

*Tests*
- `node --test tests/superui/validate_bundle.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `checkEffectLines` is a pure function over the bundle's file contents.
2. Add `"missing-effect-line"` to `FindingCategory`.
3. Add `export function checkEffectLines(bundleDir: string): Finding[]`: read `DESIGN.components.md` only (patterns describe composition, not painted surfaces), split it into blocks on `^## ` (`assemble_specs.ts` guarantees the slug wrappers are the only `## ` headings), and for each block require a line matching `/^[ \t>|*-]*\*{0,2}(border|shadow|gradient)\*{0,2}[ \t]*:/im` per property - horizontal-whitespace classes only, never `\s`, which under `/m` would straddle lines (the same reason `CANONICAL_LINE_RE` in `inventory-format.ts` uses `[ \t]*`). Emit one finding per missing property naming the slug and the property.
4. Call it in `main` after `checkSections` and before `checkForbidden`, appending to the same findings array so the existing `FINDING:` printing and exit-1 behaviour apply unchanged.
5. Document the new category in the header's "Finding categories" list - including that `none` is a satisfying value and that patterns are out of scope - and add `checkEffectLines` to the header's OUT contract, which enumerates the emission order verbatim.

### Edge cases
- `DESIGN.components.md` absent, or present as `assemble_specs.ts`'s "None catalogued." stub with no `## ` wrapper: zero blocks, zero findings.
- A property line written as a table cell or a bold label (`**shadow:**`, `| shadow: none |`): the leading-decoration allowance in the regex accepts it, matching how `CANONICAL_LINE_RE` already tolerates markdown decoration.
- `shadow: none` satisfies the check - absence of an effect is a measurement, and the semantic case (declared `none` against a measured `shadow.card`) belongs to `bundle-reviewer`'s `flat-render`, not here.
- A slug block mentioning `border-radius:` must not satisfy the `border` requirement; anchor the property word so `border-radius` does not match.

### Contracts
`FindingCategory` gains `"missing-effect-line"`. `checkEffectLines(bundleDir: string): Finding[]` - new exported symbol, read-only.

### DoD
A satellite whose `## card` block carries `border:`, `shadow:` and `gradient:` lines yields no finding; one missing `gradient:` yields exactly one `FINDING: missing-effect-line` naming `card`; both test commands green.


### Covered criteria
5. `validate_bundle.ts` emits one `FINDING: missing-effect-line <detail>` per missing property (up to three) for any `## <slug>` block in `DESIGN.components.md` lacking a `border:`, `shadow:` or `gradient:` property line, and emits nothing for a block carrying all three (including where the value is `none`).
8. `node --test "tests/**/*.test.ts"` passes from the repo root.
