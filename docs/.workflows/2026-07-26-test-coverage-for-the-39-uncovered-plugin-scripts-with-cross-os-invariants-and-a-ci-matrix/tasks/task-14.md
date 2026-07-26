
## Task 14 - test(superui): cover check_node.sh and setup/check_env.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/check_node.test.ts`
- add - `tests/superui/check_env.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superui/check_node.test.ts`
- `node --test tests/superui/check_env.test.ts`

### Approach
1. `check_node.test.ts`: the same threshold matrix as Task 12 applied to `superui/scripts/check_node.sh`,
   asserting the two copies have identical observable behaviour on identical input - the contract they are
   documented to share.
2. `check_env.test.ts` against `superui/skills/setup/scripts/check_env.sh`: with `CLAUDE_PLUGIN_ROOT` set,
   assert it delegates to that root's `check_node.sh`; with it unset, assert the
   `../../../scripts/check_node.sh` relative fallback resolves; assert `NODE <cmd>` + `VERSION <v>` when
   node exists and `NODE MISSING` when it does not; exit 0 in every case.
3. Both are `#!/bin/sh` → `forEachShell("posix", …)`.

### Edge cases
`CLAUDE_PLUGIN_ROOT` pointing at a nonexistent dir; pointing at a dir with no `check_node.sh`; a value
containing a space. Invoking the script from a different `cwd` than its own directory (the fallback is
resolved from `$0`, not `cwd`).

### Contracts
`check_env.sh` → `NODE <cmd>` | `NODE MISSING`, plus `VERSION <v>` when node exists; exit 0 always.

### DoD
Both test files green; the two `check_node.sh` copies are asserted equivalent on the same input matrix.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
