
## Task 2 - fix(superui): correct the half-pixel bias in the corner-radius fit
- Covers: criteria #2
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/measure_geometry.ts (`predictedOffset`)
- add - tests/superui/measure_geometry.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts` - all assertions pass

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing test first: build an in-memory `RgbImage` (`{width, height, rgb: Uint8Array}`, row-major RGB, exported at `measure_geometry.ts:74`) holding a 60x60 rounded rectangle whose corner is rasterised by the standard pixel-centre rule - pixel `(x,y)` is painted when its centre `(x+0.5, y+0.5)` lies inside the shape, the arc centre inset by `r` from both edges. Assert `fitRadius(img, {x,y,w,h}, "tl", tol)` returns exactly the constructed `r` for r = 0, 4, 8, 12, 16, 20. VERIFY-RED: today it returns 0, 2, 5, 9, 14, 18.
2. Fix `predictedOffset` to sample the pixel centre: let `cy = row + 0.5`, return 0 when `cy >= r`, set `d = r - cy`, and return `Math.max(0, Math.ceil(r - Math.sqrt(Math.max(0, r*r - d*d)) - 0.5))`. Change nothing in `fitRadius` itself.
3. VERIFY-GREEN: all six radii match, each at `confidence` 1.00.
4. Extend the suite to all four corners (`tl`, `tr`, `bl`, `br`) on the r = 12 fixture, and to a disc of diameter 60 in a 60x60 box, whose radius is 30 by symmetry with no rasterisation convention to argue about.
5. Correct the `predictedOffset` doc comment above `measure_geometry.ts:216`, which currently claims the test is "the same test used to render a rounded corner" - it now is.

### Edge cases
- `r = 0` (a sharp corner) must stay 0, not become negative - hence the `Math.max(0, ...)`.
- A uniform image with no edge still returns `radius = maxR` at low confidence; that pre-existing behavior is out of scope and must not regress into a crash.
- Antialiased corners stay approximate by nature; the suite asserts hard-edged fixtures only.

### Contracts
`fitRadius(img, box, corner, tol) -> {radius, confidence}` - signature unchanged, returned `radius` now matches the constructed ground truth.

### DoD
The suite is green, and a token measured through `--radius` matches the true CSS `border-radius` of the sampled corner.


### Covered criteria
2. `fitRadius` returns the constructed ground-truth radius (0, 4, 8, 12, 16, 20 on hard-edged fixtures) instead of a value short by 2-3 px.
