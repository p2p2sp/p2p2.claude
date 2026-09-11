
## Task 3 - feat(scripts): decompose.sh commits only its run directory, prints the repo root and works from any cwd
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #25, #28, #30

### Dependencies
- none - blocks: 11, 12

### Files
- modify - superdev/scripts/decompose.sh (repo-root `cd`, `root:` index line, pathspec-limited commit, header comment)
- modify - tests/superdev/decompose.test.ts (two new cases, `root:` line in the happy-path assertion)

### Test Commands
#### Build
- `bash -n superdev/scripts/decompose.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -n 'git add -A$' superdev/scripts/decompose.sh` - expected: no output, exit 0

### Approach
1. Right after argument validation, resolve `$plan` to an absolute path (`cd "$(dirname "$plan")" && pwd` joined with the basename), then, when `git rev-parse --show-toplevel` succeeds, `cd` into that toplevel so every path the script derives (`docs/.workflows/...`) is repo-root-relative regardless of the caller's cwd; outside a repo keep the current behaviour (cwd stays).
2. Print a new index line `root: <absolute toplevel path>` directly after `workdir:` (outside a repo: the absolute cwd). Document it in the header's index block; `workdir:` stays repo-relative because `cleanup-run.sh` requires that shape.
3. Replace `git add -A` with `git add -A -- "$dir"` so only the run directory enters the decomposition commit; keep the noise-on-stderr and `nothing to commit` behaviour.
4. Add the test "a dirty working tree: a pre-existing modified tracked file and an untracked stray file are not part of the decomposition commit" (assert `git show --name-only HEAD` lists only paths under `docs/.workflows/`) and "run from a subdirectory of the repo: the working dir is created under the repo root and the index prints root:" (run with `cwd: path.join(repo.dir, "sub")` and a plan path relative to that subdirectory).
5. Extend the happy-path assertion so the index order is `workdir:`, `root:`, `status:`/`base:`... and `root:` equals `slash(repo.dir)` (use the harness `slash()` from `tests/harness/paths.ts`; on Windows `git rev-parse --show-toplevel` under Git-Bash prints `C:/...`, so compare case-insensitively on the drive letter).

### Edge cases
- Plan path already absolute: the resolution step is a no-op.
- Repo root path containing spaces: every `cd` and pathspec is quoted.
- Outside a git repository: no `cd`, `root:` is the absolute cwd, commit skipped as today.

### Contracts
- New index line `root: <absolute path>` consumed by Task 10's orchestrators to build absolute paths for every fork/agent label.

### DoD
`decompose.sh` run from `<repo>/sub` with `../plan.md` builds `<repo>/docs/.workflows/<run>/`, prints `root:`, and its commit contains only the run directory; the two new tests and the full suite pass.


### Covered criteria
25. Każda komenda orkiestratora działa identycznie niezależnie od cwd, w którym uruchomiono sesję (build uruchomiony z `src/` daje ten sam wynik co z korzenia repo).
28. Po udanym commicie `commit-task.sh` wypisuje linię `commit: <sha>`, której orkiestrator używa jako `since` kolejnej rundy; `scripts/decompose.sh` stawia w indeksie tylko katalog runu, który sam utworzył; commity raportów i close-outu dostają jawny pathspec (katalog runu plus ścieżki z linii `NODE:`/`RULE:`/`ADR:`/`CHANGELOG:` writerów).
30. `tests/superdev/decompose.test.ts` ma przypadek: dekompozycja przy brudnym drzewie nie wciąga obcych plików do commitu dekompozycji; `tests/superdev/resolve-input.test.ts` ma przypadek z cwd w podkatalogu repo, w którym ścieżka względna od korzenia repo rozwiązuje się poprawnie.
