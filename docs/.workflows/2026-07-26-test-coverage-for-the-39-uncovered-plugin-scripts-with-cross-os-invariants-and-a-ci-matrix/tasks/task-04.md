
## Task 4 - test(superdev): cover read-config.sh and resolve-input.sh, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/read-config.test.ts` (new dir `tests/superdev/`)
- add - `tests/superdev/resolve-input.test.ts`
- delete - `superdev/scripts/read-config.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/read-config.test.ts`
- `node --test tests/superdev/resolve-input.test.ts`

### Approach
1. Port all 5 cases of `superdev/scripts/read-config.test.sh` into `read-config.test.ts` via `runScript`
   with `cwd` set to a `withTempDir` project root, then delete the `.sh` file.
2. Extend `read-config.test.ts`: absent `.claude/superdev.yml`; every key false; keys in a different order
   than the fixed output order; `adr:true` without a space; `adr : true`; `adr: TRUE`; a commented
   `# adr: true`; a CRLF-authored yml; a key appearing twice; output order is always
   `adr`, `rules`, `memory`, `docs`; exit is always 0.
3. Write `resolve-input.test.ts` against `superdev/scripts/resolve-input.sh`: happy path with two labels;
   an optional `'?plan'` label absent; an optional label present but its file missing; a required label
   missing; a required label present but its file missing - asserting stdout is *only* the `## INPUT ERROR`
   block with zero file content and exit 0; no labels at all - exit 1 with the usage line on stderr.
4. Add the label-parsing edge cases: a label value with leading/trailing spaces; a CRLF args block; the
   same label twice (first wins); a value containing a space; an empty args block with a required label;
   a label whose value is a directory, not a file.

### Edge cases
`value_of` interpolates the label into a `sed` expression, so a label containing `/` or `&` is a real risk -
assert the observed behaviour rather than assuming it is safe. Empty `$ARGUMENTS`. A file with no trailing
newline (the script appends one). A UTF-8 path.

### Contracts
`resolve-input.sh <args-block> <label|?label>...` → stdout `## <label> (<path>)` + file body per label, or
a sole `## INPUT ERROR` block; exit 0 always except exit 1 when called with no labels.

### DoD
Both test files green; `superdev/scripts/read-config.test.sh` no longer exists; `git grep -c` finds no
reference to it.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
7. `superdev/hooks/scripts/review-plan.test.sh`, `superdev/scripts/read-config.test.sh` and
   `superdev/skills/setup/scripts/bootstrap.test.sh` are deleted, and every case they asserted is asserted
   in `tests/superdev/`.
