
## Task 1 - feat(superui): report the full shadow falloff profile
- Covers: criteria #1, #8
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/measure_geometry.ts (`ShadowResult`, `scanShadow`, `main`, header comment)
- modify - tests/superui/measure_geometry.test.ts

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - prints usage, exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `scanShadow` is a pure function over an `RgbImage`, so each behaviour lands as a failing test first.
2. Extend `ShadowResult` with `samples: { offset: number; delta: number; hex: string }[]`, `peakOffset: number` and `peakHex: string`; keep `extent`, `peakDelta` and `bgHex`.
3. Rewrite `scanShadow`'s walk: step outward from the edge for at most 32 samples - today's `steps <= margin` guard admits 33 iterations; pin the intended count at exactly `margin` samples and assert it in a test - pushing one `samples[]` entry per step (`offset` 0-based from the edge, `delta` = `maxChannelDelta` against `bg`, `hex` = that pixel). Stop early only after `SETTLE_RUN` (3) consecutive steps whose `delta <= SETTLE_DELTA` (1) - a fixed floor, never `--tol` - so the profile of a delta-3 shadow is walked in full.
4. Derive from the walked samples: `extent` = count of leading samples whose `delta > tol` (today's semantics, unchanged); `peakDelta` = max `delta` over all walked samples; `peakOffset` / `peakHex` = the offset and hex of that maximum (first occurrence on a tie); `peakDelta = 0`, `peakOffset = 0` and `peakHex = bgHex` when no sample was walked. Truncate `samples[]` after the LAST sample whose `delta > SETTLE_DELTA` - the trailing settle steps are walked to prove the falloff ended, never retained - so a 4px falloff yields exactly 4 entries.
5. Wire the new fields into `main`'s shadow branch for `--json`, and into the human-readable output as `extent=N peakDelta=N peakOffset=N peakHex=#xxxxxx bgHex=#xxxxxx` followed by one `sample <offset> <delta> <hex>` line per entry.
6. Update the file header's `--shadow` mode paragraph and its OUT contract to describe the profile and the tolerance-independence of `samples[]` / `peakDelta`.

### Edge cases
- Box edge flush against the image border: the walk starts out of bounds and yields zero samples - report `extent=0 peakDelta=0 peakOffset=0 peakHex=<bgHex>` and an empty `samples[]`, never a crash.
- A neighbouring element within the 32px margin: the settle rule stops the walk once the falloff has returned to background for 3 consecutive steps, so the neighbour is not sampled as a shadow peak.
- A shadow still above `SETTLE_DELTA` at step 32: the walk ends at the margin; `samples[]` is truncated there by design.

### Contracts
`ShadowResult` gains `samples: { offset: number; delta: number; hex: string }[]`, `peakOffset: number`, `peakHex: string`. `extent` and `bgHex` keep their current meaning; `peakDelta` becomes the maximum over the walked profile rather than over the above-tolerance prefix.

### DoD
`--shadow` on a synthetic image whose edge carries a 4px falloff peaking at delta 3 reports `peakDelta=3` with a 4-entry `samples[]` under the default `--tol 8`; both test commands green.


### Covered criteria
1. `measure_geometry.ts --shadow` reports `samples[]` (per-step `offset`, `delta`, `hex`), `peakOffset` and `peakHex` alongside the existing `extent`, `peakDelta` and `bgHex`, in both the human-readable and the `--json` form; `peakDelta` and `samples[]` are tolerance-independent, so a shadow whose maximum per-channel delta is 3 is reported under the default `--tol 8` instead of vanishing.
8. `node --test "tests/**/*.test.ts"` passes from the repo root.
