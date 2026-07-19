
## Task 1 — feat(superui): add measure_geometry.ts pixel-geometry sampler
- Covers: criteria #5

### Dependencies
- none — blocks: Task 2, Task 4, Task 6

### Files
- add - `superui/scripts/measure_geometry.ts` (`main`, `parseArgs`, `loadImage`, `scanRuns`, `fitRadius`, `scanShadow`, `inkBox`)
- add - `.temp/design-extractor-fixtures/make_fixture.ts` (`writePng`, `main`) — dev-time only, never shipped, not referenced by any skill

### Test Commands
*Build*
- `sh superui/scripts/check_node.sh` — expect one line `NODE_OK <cmd>`; use `<cmd>` below as `NODE`

*Tests*
- `$NODE .temp/design-extractor-fixtures/make_fixture.ts .temp/design-extractor-fixtures/box.png` — expect `wrote .temp/design-extractor-fixtures/box.png 240x160`
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --edges 0,80,240,1 --axis h` — expect five runs: white 0..59, border 2px at 60, fill 96px at 62, border 2px at 158, white from 160
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --radius 60,40,100,80 --corner tl` — expect `radius=8` with confidence >= 0.8
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --ink 62,48,96,70` — expect ink bounds exactly x=70..109, y=90..109 and `capHeight=20`; the rect starts at y=48 to clear the 8px top-left corner arc as well as the four straight borders, so the modal background is unambiguously the box fill
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --shadow 60,40,100,80 --side bottom` — expect `extent=6` with a non-zero `peakDelta` and `bgHex=#ffffff`
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --edges 0,0,9999,1 --axis h; echo $?` — expect `1` and an out-of-bounds message on stderr
- `$NODE superui/scripts/measure_geometry.ts --edges 0,0,1,1; echo $?` — expect `2` and a usage block

### Approach
1. Write `make_fixture.ts`: emit a 240x160 PNG via `node:zlib.deflateSync` over raw scanlines with filter byte 0 per row — IHDR (color type 2, depth 8), single IDAT, IEND, CRC32 per chunk. Canvas `#ffffff`; a `#3366f2` box at x=60,y=40,w=100,h=80 with an 8px top-left corner radius and a 2px `#1b3fa0` border; a `#111111` glyph block at exactly x=70,y=90,w=40,h=20 (rows 90..109, deliberately clear of row 80 so the `--edges` row scan sees an unbroken fill run); and a drop-shadow band at rows y=120..125 darkening from `#c8c8c8` at y=120 and lightening per row so that y=125 is still measurably below white and y=126 is the first true `#ffffff` row, giving `--shadow` a deterministic extent of 6. Print `wrote <path> <W>x<H>`.
2. Write `measure_geometry.ts` reusing `vendor/png-decode.ts` and `vendor/jpeg-decode.ts` unchanged via `loadImage(path)` returning `{ width, height, rgb }` row-major RGB, mirroring how `sample_colors.ts` consumes them.
3. Implement `scanRuns(rgb, box, axis, tol)` — walk the box along `axis`, group consecutive pixels whose per-channel delta stays within `tol`, emit `offset length #hex` per run. This one primitive yields paddings, gaps, border widths, control heights and divider widths.
4. Implement `fitRadius(rgb, box, corner, tol)` — in the corner quadrant record, per row, the first column whose color differs from the outside background; fit the largest `r` whose quarter-circle matches those offsets, and report `confidence` as the fraction of rows within one pixel of the fit. Implement `scanShadow(rgb, box, side, tol)` — step outward from the box edge until luminance returns to the far background, printing `extent` (the count of rows or columns that differ from the far background), `peakDelta`, `bgHex`. Implement `inkBox(rgb, box, tol)` — define background as the modal color of the rect, then report the bounds of every pixel differing from it by more than `tol`, plus `capHeight`, and for multi-row ink the `lineStarts` and derived `lineHeight`.
5. Mirror `sample_colors.ts` conventions exactly: argparse-style flags with prefix abbreviation, `--tol N` (default 8, per-channel), `--json` for structured output, human-readable lines otherwise, and exit codes 0 ok / 1 unreadable image or out-of-bounds box or bad flag values / 2 usage errors. Head comment carries the full `IN :` / `OUT:` / exit-code contract plus the stated tolerance and the alpha limitation.

### Edge cases
- Alpha is discarded by both vendor decoders and cannot be recovered — a screenshot with transparency yields the raw under-color. Document this in the header as a known limitation; do not attempt compositing.
- Interlaced (Adam7) PNG, WebP and AVIF fail in the decoders with exit 1 — surface the decoder message verbatim, do not wrap it.
- Box partially or wholly outside the image: exit 1 with the offending rect echoed, never a silent clamp.
- Zero-width or zero-height box: exit 1.
- Antialiased edges: `--tol` governs run grouping; a run shorter than 1px cannot exist, so subpixel edges report as the nearest whole pixel and the header states this.
- `fitRadius` on a square corner returns `radius=0` with high confidence, not an error.

### Contracts
`loadImage(path: string): { width: number, height: number, rgb: Uint8Array }` — row-major RGB, 3 bytes per pixel. CLI: `measure_geometry.ts IMAGE (--edges x,y,w,h --axis h|v | --radius x,y,w,h --corner tl|tr|bl|br | --shadow x,y,w,h --side top|right|bottom|left | --ink x,y,w,h) [--tol N] [--json]`.

### DoD
Every test command above produces the stated output and exit codes. The script imports nothing outside `node:` builtins and the two existing vendor decoders.


### Covered criteria
5. `measure_geometry.ts` reports the known geometry of a synthetic fixture image within the tolerance stated in its header, for each of its four modes.
