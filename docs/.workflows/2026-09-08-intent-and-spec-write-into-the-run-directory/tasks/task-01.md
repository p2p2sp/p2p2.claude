
## Task 1 - feat(superdev): decompose.sh adopts the run directory from Intent/Spec
- Covers: criteria #1, #2, #3
- TDD: none

### Dependencies
- none - this task is the contract the two skill tasks write against.

### Files
- modify - superdev/scripts/decompose.sh (`run_dir_of`, `dir`, `spec_path`, `intent_path`, `cleanup_on_failure`)
- modify - tests/superdev/decompose.test.ts (`simplePlan`, `superPlan`, `run`, `todayISO`, `seedInitialCommit`)

### Test Commands
#### Build
- none - the repo has no build step (markdown, JSON and shell only).

#### Tests
- `node --test "tests/superdev/decompose.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Move the `Spec:` and `Intent:` extraction blocks (`spec_line`/`spec_path` with its `exit 4`, `intent_line`/`intent_path` with its stderr warning) above the `dir=` assignment, keeping their current text and exit codes unchanged.
2. Add `run_dir_of()` taking one path: return empty for an empty argument; take `dirname`, replace `\` with `/`, return empty unless the result matches `*docs/.workflows/*`, otherwise keep the tail after the last `docs/.workflows/` and echo `docs/.workflows/` plus that tail's **first segment only**, so a deeper-nested path still adopts the run directory itself rather than a subdirectory of it.
3. Set `dir` to `run_dir_of "$intent_path"`, falling back to `run_dir_of "$spec_path"`, and only then to the existing `docs/.workflows/$(date +%F)-${slug}`; leave `slug` computed as today because `cleanup-run.sh` and the commit message still read it.
4. Leave `dir_preexisted` and `cleanup_on_failure` as they are - an adopted directory always pre-exists, so the trap already refuses to remove it; extend the header comment block to document the adoption rule and this guarantee.
5. Add the six test cases from criterion #3 to `tests/superdev/decompose.test.ts` using the existing `withGitRepo`, `seedInitialCommit`, `simplePlan`, `superPlan`, `specFixture`, `taskBlock`, `run`, `todayISO` and `slash` helpers, writing the intent/spec fixtures into `<repo>/docs/.workflows/2026-01-02-adopted/` rather than the out-of-repo `withTempDir` directory the current intent tests use.

### Edge cases
- `Intent:` naming a file that does not exist: unchanged - warning on stderr, the path is dropped, and adoption then falls through to `Spec:` or to the derived name.
- `Spec:` naming a file that does not exist: unchanged `exit 4`; because extraction now runs before the directory is created, no working dir is left behind at all.
- A file sitting directly in `docs/.workflows/` (a run started before this change): `dirname` yields `docs/.workflows` with no trailing slash, the pattern does not match, and the derived name is used - old plans keep decomposing exactly as today.
- A Windows-style absolute path (`C:\...\docs\.workflows\<run>\intent.md`): backslashes are normalised before the match, so adoption still fires.
- A path nested deeper than one level (`docs/.workflows/<run>/sub/intent.md`): only the first segment is adopted, so the working dir is `docs/.workflows/<run>`, never `<run>/sub`.

### Contracts
- `run_dir_of <path>` -> repo-relative run directory on stdout, or empty output; never exits non-zero.
- The stdout index keeps its current shape (`workdir:`, `status:`, `base:`, `plan-header:`, `plan:`, optional `spec:`, optional `intent:`, then `<task-file><TAB><title>`); only the `workdir:` value can now be an adopted directory.

### DoD
`node --test "tests/**/*.test.ts"` is green, including the six new adoption cases and every pre-existing decompose case.


### Covered criteria
1. `decompose.sh` uses the directory holding the plan's `Intent:` file as its working dir when that directory sits under `docs/.workflows/`, falling back to the `Spec:` file's directory, and only then to the current `docs/.workflows/<YYYY-MM-DD>-<plan-slug>/` derivation; an absolute path carrying a `docs/.workflows/` segment is normalised to the repo-relative form.
2. A failing `decompose.sh` run never deletes an adopted, pre-existing run directory, so a user's `intent.md` and `spec.md` survive a decomposition error.
3. `tests/superdev/decompose.test.ts` covers adoption from `Intent:`, adoption from `Spec:` alone, `Intent:` winning over a `Spec:` in a different directory, the absolute-path form, the fallback when neither path sits under `docs/.workflows/`, and survival of the adopted directory on a failed run; the whole suite passes.
