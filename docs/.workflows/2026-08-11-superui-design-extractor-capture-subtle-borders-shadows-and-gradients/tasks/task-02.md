
## Task 2 - feat(superui): add the --gradient measurement mode
- Covers: criteria #2, #8
- TDD: required

### Dependencies
- Task 1 - blocks: none functionally; both edit `measure_geometry.ts`, so Task 1 lands first to keep the header and `main` edits sequential.

### Files
- modify - superui/scripts/measure_geometry.ts (`GradientResult`, `scanGradient`, `OPTION_NAMES`, `ParsedArgs`, `parseArgs`, `usageText`, `main`, header comment)
- modify - tests/superui/measure_geometry.test.ts

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - usage lists `--gradient`, exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `scanGradient` is a pure function over an `RgbImage`.
2. Add `export function scanGradient(img: RgbImage, box: Box, axis: Axis): GradientResult`, walking the box's midline on the chosen axis (the same midline `scanRuns` uses) and reading every pixel along it.
3. Compute `startHex` / `endHex` from the first and last pixel, `midHex` from the middle pixel, `totalDelta` = `maxChannelDelta(start, end)`, and `maxDeviation` = the largest `maxChannelDelta` between any sampled pixel and the linear interpolation of `start`->`end` at that position.
4. Classify into `verdict`: `flat` when `totalDelta < 3`; otherwise `linear` when `maxDeviation <= Math.max(2, totalDelta * 0.25)`; otherwise `nonlinear`. Thresholds are fixed constants in the module, not flags.
5. Register the mode: add `--gradient` to `OPTION_NAMES` and `ParsedArgs`, include it in `main`'s `modeCount` exclusivity check, require `--axis h|v` exactly as `--edges` does, and emit `startHex=... midHex=... endHex=... totalDelta=N maxDeviation=N verdict=<v>` (human) or the equivalent keys (`--json`).
6. Update `usageText`, `helpText` and the file header's mode list, IN contract and exit-code notes to include `--gradient`.

### Edge cases
- A box 1px wide/tall on the sampled axis: `start`, `mid` and `end` collapse to the same pixel - `totalDelta = 0`, `maxDeviation = 0`, `verdict = flat`.
- Dithering noise on a flat surface: `totalDelta < 3` keeps the verdict `flat`, so `--gradient` never invents a ramp out of compression noise.
- A two-tone surface (a hard split, not a ramp): `maxDeviation` far exceeds the linear band, so the verdict is `nonlinear`, not `linear`.
- Reused `--tol` is not consulted by this mode; the classification is tolerance-independent.

### Contracts
`GradientResult { startHex: string; midHex: string; endHex: string; totalDelta: number; maxDeviation: number; verdict: "flat" | "linear" | "nonlinear" }`. CLI: `--gradient x,y,w,h --axis h|v`, mutually exclusive with `--edges` / `--radius` / `--shadow` / `--ink`.

### DoD
A synthetic 8-step vertical ramp classifies `linear` with the measured endpoint hexes; a flat surface with +/-1 noise classifies `flat`; both test commands green.


### Covered criteria
2. `measure_geometry.ts --gradient x,y,w,h --axis h|v` exists and reports `startHex`, `midHex`, `endHex`, `totalDelta`, `maxDeviation` and a `verdict` of `flat|linear|nonlinear`; a synthetic 8-step linear ramp classifies as `linear`, a flat surface carrying +/-1 noise classifies as `flat`.
8. `node --test "tests/**/*.test.ts"` passes from the repo root.
