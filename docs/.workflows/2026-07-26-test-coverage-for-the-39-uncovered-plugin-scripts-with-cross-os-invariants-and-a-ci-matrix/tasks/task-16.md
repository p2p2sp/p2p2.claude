
## Task 16 - test(superui): cover the vendored decoders - png-decode deeply, jpeg-decode at its boundary
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/png-decode.test.ts`
- add - `tests/superui/jpeg-decode.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superui/png-decode.test.ts`
- `node --test tests/superui/jpeg-decode.test.ts`

### Approach
1. `png-decode.test.ts`: using `writePng` from the harness, assert `decodePng` round-trips the colour-type
   × bit-depth matrix the module claims - types 0, 2, 3, 4 and 6 at depths 1, 2, 4, 8 and 16 where the
   spec allows the combination - comparing decoded RGB against the constructed ground truth.
2. Assert all five filter types (None, Sub, Up, Average, Paeth) by emitting each filter explicitly on a
   fixture whose expected output is computed independently in the test.
3. Assert the error contract: `isPng` rejects a non-PNG buffer; an interlaced image raises
   `PngUnsupportedError` explicitly rather than decoding wrongly; a truncated IDAT, a bad CRC, a zero-width
   IHDR and an unknown critical chunk each raise `PngDecodeError`.
4. `jpeg-decode.test.ts` at boundary depth only: embed a small base64 baseline JPEG of known dimensions and
   solid colour, assert `decode(buf, { useTArray: true, formatAsRGBA: false })` returns the expected
   `width`, `height` and pixel bytes, and that the ESM conversion exposes `decode` as a function. Do not
   re-test the upstream jpeg-js suite.

### Edge cases
A palette image whose `tRNS` chunk adds transparency. A 16-bit image (byte order). A 1×1 image. A grayscale
image with an odd width at depth 1 (sub-byte row padding). An empty buffer.

### Contracts
`decodePng(buf) → { width, height, data }`; `isPng(buf) → boolean`; `PngDecodeError`, `PngUnsupportedError`.
`decode(buf, opts) → { width, height, data }`.

### DoD
Both test files green; the png matrix covers every colour type the module claims to support.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
