
## Task 15 - test(superui): cover section-model, inventory-format, assemble_specs, copy_screens and sample_colors
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/section-model.test.ts`
- add - `tests/superui/inventory-format.test.ts`
- add - `tests/superui/assemble_specs.test.ts`
- add - `tests/superui/copy_screens.test.ts`
- add - `tests/superui/sample_colors.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/superui/*.test.ts"`

### Approach
1. `section-model.test.ts`: assert `SECTION_IDS` holds no duplicates, `SECTION_TITLES` has an entry for
   every id in `SECTION_IDS` and no extra keys, `TOKEN_BACKED_SECTIONS` is a subset of `SECTION_IDS`,
   `isTokenSection()` agrees with that set for every id, and `TOKEN_SECTION_RE` / `UNKNOWN_SECTION_RE`
   match every id they should and reject `3.11`, `4.1` and a bare `3`.
2. `inventory-format.test.ts` gives the module its own file (today it is only covered incidentally through
   `validate_bundle.test.ts`): `INVENTORY_DELIMITER` is U+00B7; `parseInventoryEntries` handles a
   well-formed entry, an entry with surrounding whitespace, a missing field, an empty line, a line using a
   look-alike middle dot, a CRLF line, and a delimiter inside a value; `canonicalRefs` deduplicates and
   preserves order; `CANONICAL_LINE_RE` tolerates the documented markdown decoration.
3. `assemble_specs.test.ts`: `SPECS_OK entries=<N> -> <OUTPUT_MD>` on stdout; the h1-shift warning on
   stderr, one line per offender; an empty specs dir producing the documented stub with exit 0; exit 1 on
   an unreadable dir, an unreadable spec, an unwritable output and a self-verify mismatch.
4. `copy_screens.test.ts`: `SCREENS_OK copied=<N> skipped=<M> -> <OUT_DIR>/screens`; deduplication of a
   screen cited twice; zero entries with exit 0; exit 1 on an unreadable inventory, a missing source dir,
   and a canonical name that is absolute or carries a path separator (both directions: `/` and `\`);
   exit 2 on usage errors.
5. `sample_colors.test.ts` at module-boundary depth per the agreed scope: argument parsing and mode
   selection (`--k`, `--points`, `--crop`, `--regions`, `--json`), mutually exclusive modes, exit 2 on
   usage errors, exit 1 on an unreadable image and on out-of-range mode arguments, and determinism -
   the same input yields byte-identical output across two runs. Feed it a real PNG built with
   `writePng` from the harness. Do not assert cluster quality.

### Edge cases
A canonical screen name with a non-ASCII character. An inventory with no entries at all. An output path
whose parent does not exist. A `--regions` value with a malformed rect. A 1×1 image. An image with an alpha
channel.

### Contracts
`assemble_specs.ts SPECS_DIR OUTPUT_MD`; `copy_screens.ts INVENTORY_MD SOURCE_DIR OUT_DIR`;
`sample_colors.ts IMAGE [--k N] [--points …] [--crop …] [--regions …] [--json]`.

### DoD
All five test files green; `inventory-format.ts` is covered by its own file rather than only through
`validate_bundle.test.ts`.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
