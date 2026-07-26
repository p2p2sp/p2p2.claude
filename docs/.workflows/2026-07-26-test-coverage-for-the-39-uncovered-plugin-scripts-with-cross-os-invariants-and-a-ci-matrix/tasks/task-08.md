
## Task 8 - test(superdev): cover the memory and rules reporter scripts
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/memory-scripts.test.ts` (covers `detect_state.sh`, `analyze_structure.sh`, `estimate_tokens.sh`)
- add - `tests/superdev/rules-scripts.test.ts` (covers `detect_state.sh`, `scan_conventions.sh`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/memory-scripts.test.ts`
- `node --test tests/superdev/rules-scripts.test.ts`

### Approach
1. `memory-scripts.test.ts` for `superdev/skills/superdev-memory/scripts/detect_state.sh`: assert the
   `root_file:` / `has_Memory_section:` / `child_nodes:` / `state:` / `action:` lines across the three
   states - no `CLAUDE.md`, a root `CLAUDE.md` without a Memory section, and a root plus child nodes -
   plus the default `[path=.]` argument and an explicit path.
2. Same file for `analyze_structure.sh` (a fixture tree three levels deep, existing `CLAUDE.md`s, a large
   dir) and `estimate_tokens.sh` (`Total tokens:` / `File count:` / `Threshold:` / `Recommendation:` on a
   fixture of known byte size; exit 1 with `Error: Path not found:` on a nonexistent path; an empty dir;
   a dir holding only ignored files).
3. `rules-scripts.test.ts` for `superdev/skills/superdev-rules/scripts/detect_state.sh`: no `.claude/rules`;
   rules present with `paths:` frontmatter; a rule missing `paths:` reported `MISSING`; `_frozen.md`
   listed under `frozen_files:` and excluded from `state:`; only frozen files present.
4. Same file for `scan_conventions.sh`: assert the section headers and that counts are integers, on a
   fixture with two languages, two naming styles and a tool config - counts only, no interpretation.

### Edge cases
A path argument containing a space and a non-ASCII character. A `.gitignore`-excluded directory must not be
counted (all four scripts source `lib_find_excludes.sh`). A `CLAUDE.md` that is an empty file. A symlinked
subdirectory. These are bash scripts - run under `forEachShell("bash", …)`.

### Contracts
none

### DoD
Both test files green; every documented stdout key of the five scripts is asserted at least once.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
