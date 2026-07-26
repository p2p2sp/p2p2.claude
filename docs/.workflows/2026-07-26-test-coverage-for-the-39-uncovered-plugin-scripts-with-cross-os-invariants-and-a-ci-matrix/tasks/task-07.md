
## Task 7 - test(superdev): cover the workflow scripts - decompose, commit-task, status-update, lib_find_excludes
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/decompose.test.ts`
- add - `tests/superdev/commit-task.test.ts`
- add - `tests/superdev/status-update.test.ts`
- add - `tests/superdev/lib_find_excludes.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/decompose.test.ts`
- `node --test tests/superdev/commit-task.test.ts`
- `node --test tests/superdev/status-update.test.ts`
- `node --test tests/superdev/lib_find_excludes.test.ts`

### Approach
1. `decompose.test.ts`: run `superdev/scripts/decompose.sh` inside a `withGitRepo`. Assert the created
   tree `docs/.workflows/<date>-<slug>/{plan-header.md,plan.md,status.md,base.md,tasks/task-NN.md,implementation/}`,
   the clean stdout index (`workdir:`, `status:`, `base:`, `plan-header:`, `plan:`, `spec:`, then
   `<task-path>\t<title>` rows), that all git noise landed on stderr, and that a commit was created with
   the `chore(<prefix>): decompose plan <slug>` subject for both the default and an explicit prefix.
2. Assert each documented exit: 1 for a missing argument and a nonexistent plan file, 4 for a referenced
   spec file that does not exist, 5 for a `Covers:` criterion absent from the source.
3. `status-update.test.ts`: valid `tasks/task-NN.md` updates `<workdir>/status.md`; exit 1 on a missing
   argument and on a nonexistent file; a path not matching `tasks/task-NN.md`; `task-07` vs `task-7`.
4. `commit-task.test.ts`: message-only commit; message + task file (asserting the `status.md` bump
   happened *before* the commit); `Nothing to commit.` with exit 0 on a clean index; exit 1 on a missing
   message; a message containing a newline, a quote and a non-ASCII character.
5. `lib_find_excludes.test.ts`: the library is sourced, not executed, so drive it through a temp bash
   wrapper that sources it, calls `load_find_excludes "$1"` and prints one array element per line. Assert
   the safety floor (`.git`, `node_modules`) is always present, the array is never empty, diagnostics go
   to stderr and stdout stays clean, and the return code is always 0.
6. Cover the parser rules: a trailing-slash directory entry; a bare name; a `*.log` file pattern skipped;
   a `!negation` skipped; a `/root-anchored` entry; a `.idea` dot-dir rescued as a directory; `**`
   normalisation; the all-glob guard (`*`, `**`, `*/`) dropped; a CRLF `.gitignore`; a duplicate entry
   deduplicated; no `.gitignore` anywhere → the bundled
   `superdev/skills/setup/assets/gitignore.txt` fallback; neither present → the stderr warning and the
   safety floor alone.

### Edge cases
`decompose.sh` in a repo with an unborn HEAD. A plan title that slugifies to an empty string. Two runs on
the same day producing the same `<date>-<slug>` dir. A plan file with CRLF. A task title containing a tab
(it would break the `\t`-separated index rows). `lib_find_excludes.sh` requires bash arrays and
`BASH_SOURCE`, so it is bash-only - exercise it under `forEachShell("bash", …)`, never under a POSIX shell.

### Contracts
`decompose.sh <plan-file> [commit-prefix]` → index on stdout, git noise on stderr; exits 0/1/4/5.
`load_find_excludes <start-path>` → sets the global `FIND_EXCLUDES` array, always returns 0.

### DoD
All four test files green under every bash major found on the machine.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
