
## Task 6 - test(superdev): cover setup/bootstrap.sh, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/bootstrap.test.ts`
- delete - `superdev/skills/setup/scripts/bootstrap.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/bootstrap.test.ts`

### Approach
1. Port the existing cases of `superdev/skills/setup/scripts/bootstrap.test.sh` (the `superdev.yml` and
   `.gitattributes` seeding matrix) into `bootstrap.test.ts`, running the script with `cwd` set to a
   `withTempDir` project root. Delete the `.sh` file.
2. Assert the stdout result lines verbatim - `superdev/skills/setup/SKILL.md` asserts them verbatim, so
   the wording is a contract, not cosmetics.
3. Add idempotence: run twice, assert the second run reports "already present" for every item and leaves
   file bytes unchanged.
4. Add the seeding edge cases: pre-existing `.gitignore` without a trailing newline; pre-existing
   `.gitattributes` that already carries the linguist rule; a `.claude/settings.json` that is invalid
   JSON; a read-only project root; `.temp/` already existing as a file rather than a directory.

### Edge cases
The append-if-absent rule must not duplicate on a file lacking a final newline. A CRLF-authored existing
`.gitignore`. Exit is 0 in every case, including the failure ones.

### Contracts
`bootstrap.sh` → one result line per seeded item on stdout, exit 0 always.

### DoD
Test file green; `superdev/skills/setup/scripts/bootstrap.test.sh` no longer exists.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
7. `superdev/hooks/scripts/review-plan.test.sh`, `superdev/scripts/read-config.test.sh` and
   `superdev/skills/setup/scripts/bootstrap.test.sh` are deleted, and every case they asserted is asserted
   in `tests/superdev/`.
