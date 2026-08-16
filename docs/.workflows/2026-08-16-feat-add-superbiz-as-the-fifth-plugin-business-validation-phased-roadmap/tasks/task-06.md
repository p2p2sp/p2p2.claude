
## Task 6 - feat(release): bump superbiz manifest in release.sh and its test suite
- Covers: criterion #11
- TDD: none

### Dependencies
- Task 1 - blocks: this task (release.sh path must exist on disk; jq fails on a missing manifest under `set -euo pipefail`)

### Files
- modify - .github/scripts/release.sh (manifests array, header comments)
- modify - tests/github/release.test.ts (PLUGINS array, fixture comments, test title)

### Test Commands
#### Build
- none

#### Tests
- `node --test "tests/github/release.test.ts"` - expected: all tests pass, 0 failures
- `node --test "tests/**/*.test.ts"` - expected: full suite passes, 0 failures

### Approach
1. `.github/scripts/release.sh` line 26: append `superbiz/.claude-plugin/plugin.json` to the `manifests` array.
2. Same file header comments: line 2 `superdev + superui + supergh + superfix` gains `+ superbiz`; lines 5-6 `ALL FOUR subdir plugin manifests` to `ALL FIVE`, dir list gains `superbiz/`.
3. `tests/github/release.test.ts` line 37: `PLUGINS` gains `"superbiz"`.
4. Same file: comments at lines 77 (`Writes the four fixture manifests`) and 107 (`four fixture manifests`) to `five`; test title at line 320 `bumps all four manifests'` to `bumps all five manifests'`.
5. Run the release test file, then the full suite from the repo root.

### Edge cases
- zsh `nomatch`: keep the test glob quoted exactly as `"tests/**/*.test.ts"` (repo-documented invocation).

### Contracts
- `manifests` array order mirrors the marketplace plugin order (superbiz last).

### DoD
Both files updated; `node --test "tests/**/*.test.ts"` exits 0 with all tests passing.


### Covered criteria
11. `.github/scripts/release.sh` `manifests` array includes `superbiz/.claude-plugin/plugin.json` and its header comments say five plugins; `tests/github/release.test.ts` `PLUGINS` includes `"superbiz"` with fixture comments and the "all four" test title updated; `node --test "tests/**/*.test.ts"` passes from the repo root.
