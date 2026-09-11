
## Task 4 - feat(scripts): resolve-input.sh resolves relative paths against the repository root
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #30, #32

### Dependencies
- none - blocks: 12

### Files
- modify - superdev/scripts/resolve-input.sh (`repo_root` resolution in `value_of` callers, header comment)
- modify - tests/superdev/resolve-input.test.ts (two new cases)

### Test Commands
#### Build
- `bash -n superdev/scripts/resolve-input.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/resolve-input.test.ts"` - expected: all tests pass (existing cases untouched: the `## <label> (<path>)` heading still prints the value as given)
- `node --test "tests/**/*.test.ts"` - expected: all tests pass

### Approach
1. Compute `root="$(git rev-parse --show-toplevel 2>/dev/null || true)"` once at the top; empty outside a repo.
2. In pass 1, after `p="$(value_of "$label")"`, derive `resolved="$p"`; when `$p` is non-empty, relative (does not start with `/` and does not match a drive-letter prefix like `C:`), and `$root` is set, and `[[ ! -f "$p" ]]`, set `resolved="$root/$p"`; validate existence on `$resolved`, store `resolved` in `paths[]` and keep `$p` as the display value in a parallel `shown[]` array.
3. In pass 2, print `## <label> (<shown>)` and `cat "<resolved>"`, so the heading is unchanged for callers that already resolve correctly and the content comes from the repo-root path otherwise.
4. Add the tests: "inside a git repo, run from a subdirectory: a repo-root-relative path resolves and injects its content" (use `withGitRepo`, create `sub/`, run with `cwd: sub`, block `plan: docs/plan.md`; assert stdout `## plan (docs/plan.md)\n\n<content>\n\n`) and "a cwd-relative path that exists is preferred over the repo-root candidate" (both files exist with different content; the cwd one is injected).

### Edge cases
- Path exists both relative to cwd and to root: cwd wins (backward compatible).
- Windows absolute path `C:/x/y.md` is treated as absolute (drive-letter check), never prefixed with root.
- The `?label` optional convention and the fail-soft `## INPUT ERROR` block are unchanged: a path missing in both places is still "not found: <shown>".

### Contracts
- Output format of `resolve-input.sh` is unchanged (heading shows the label value as given).

### DoD
A fork started with cwd `src/` injects `docs/.workflows/<run>/plan.md` correctly; new tests pass; existing 16 cases unchanged and green; full suite green.


### Covered criteria
30. `tests/superdev/decompose.test.ts` ma przypadek: dekompozycja przy brudnym drzewie nie wciąga obcych plików do commitu dekompozycji; `tests/superdev/resolve-input.test.ts` ma przypadek z cwd w podkatalogu repo, w którym ścieżka względna od korzenia repo rozwiązuje się poprawnie.
32. `scripts/resolve-input.sh` rozwiązuje ścieżkę względną względem korzenia repozytorium (poza repo: względem cwd, jak dziś), więc fork wywołany z cwd `src/` czyta `docs/.workflows/<run>/plan.md` poprawnie.
