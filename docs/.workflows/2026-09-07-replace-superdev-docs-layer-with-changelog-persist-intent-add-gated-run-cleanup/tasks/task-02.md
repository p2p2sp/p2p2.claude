
## Task 2 - Add cleanup-run.sh with its regression suite
- Covers: criteria #2
- TDD: none

### Dependencies
- none

### Files
- add - superdev/scripts/cleanup-run.sh
- add - tests/superdev/cleanup-run.test.ts

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/cleanup-run.test.ts` -> `# fail 0`
- `node --test tests/portability.test.ts` -> `# fail 0`

### Approach
1. Write `cleanup-run.sh` (`#!/usr/bin/env bash`, `set -euo pipefail`, header I/O contract in the style of `decompose.sh`): args `<workdir> [commit-prefix]` (prefix default `simplebuild`); missing arg or missing dir -> usage on stderr, exit 1.
2. Safety guard: the normalized workdir path (leading `./` and trailing `/` stripped) must start with `docs/.workflows/` (so an absolute path is refused too - the orchestrator always passes decompose's relative `workdir:`; state this in the header contract) and contain `status.md`; otherwise print `CLEANUP: <workdir> (skipped - not a superdev run dir)` and exit 0.
3. Completion check: `last` = number from `status.md` `task: NN`; `highest` = max NN over `tasks/task-*.md` (no task files -> `00`); `10#$last -ne 10#$highest` or `highest` is `00` -> print `CLEANUP: <workdir> (skipped - build not complete: task <last> of <highest>)`, exit 0, nothing removed.
4. Resolve extra files from `plan-header.md`: `spec` = value of the first `Spec:` line, `intent` = value of the first `Intent:` line (trim spaces, drop a trailing `<!-- ... -->`); keep each only when non-empty and the file exists.
5. Removal: `slug` = workdir basename with the leading `YYYY-MM-DD-` stripped. Outside a git repo (`git rev-parse --git-dir` fails) -> `rm -rf` the workdir and `rm -f` the resolved files, print `CLEANUP: <workdir> (removed - no git repository)`, exit 0. Inside git -> for each target: `git rm -r -q --ignore-unmatch -- <target> >&2` (removes tracked files from index and working tree) then `rm -rf <target>` (clears untracked leftovers); if `git diff --cached --quiet` -> print `CLEANUP: <workdir> (removed - nothing to commit)`; else `git commit -q -m "chore(<prefix>): clean up run <slug>" >&2` and print `CLEANUP: <workdir> (removed)`.
6. Write `cleanup-run.test.ts` with `withGitRepo` / `withTempDir` from `tests/harness/tmp.ts`, `runScript(SUT, args, { cwd, env, shell: "bash" })` as in `commit-task.test.ts`, and `slash()` for printed paths. Fixture builder creates `docs/.workflows/2026-01-02-demo/{status.md,plan-header.md,tasks/task-01.md,tasks/task-02.md,implementation/}` plus optional `docs/.workflows/20260102-demo.md` (spec) and `docs/.workflows/20260102-demo-intent.md`, committed first. Cases: complete run with spec + intent -> all three gone, commit subject `chore(simplebuild): clean up run demo`, stdout `CLEANUP: ... (removed)`; prefix arg -> `chore(superbuild): ...`; incomplete (`task: 01` of 02) -> nothing removed, `skipped - build not complete`, exit 0; no `Spec:`/`Intent:` lines -> only the workdir removed; `Intent:` naming a missing file -> ignored; workdir outside `docs/.workflows/` -> `skipped - not a superdev run dir`, dir untouched; no git repo -> files removed, `removed - no git repository`; missing arg -> exit 1.

### Edge cases
- `status.md` unparsable -> treated as `00` -> skipped as incomplete.
- Workdir passed with a trailing slash or `./` prefix -> normalized before the guard and before printing.
- Spec/intent path already deleted (second run) -> silently skipped; a workdir already gone -> exit 1 (missing dir).

### Contracts
- stdout: exactly one line `CLEANUP: <workdir> (removed|removed - no git repository|removed - nothing to commit|skipped - <reason>)`; all git output on stderr; exit 0 for every documented outcome except missing/invalid args (exit 1).

### DoD
`cleanup-run.test.ts` green on Git-Bash and POSIX; portability sweep green (shebang, no CRLF).


### Covered criteria
2. `superdev/scripts/cleanup-run.sh <workdir> [commit-prefix]` on a completed run (status.md task number equals the highest `tasks/task-NN.md`) removes the workdir, the spec named by `Spec:` in `plan-header.md` and the intent named by `Intent:` (each only when present), commits `chore(<prefix>): clean up run <slug>` and prints `CLEANUP: <workdir> (removed)`; on an incomplete run it removes nothing, exits 0 and prints `CLEANUP: <workdir> (skipped - <reason>)`; outside a git repository it removes the files, skips the commit and prints `CLEANUP: <workdir> (removed - no git repository)`; a workdir outside `docs/.workflows/` (including an absolute path) is skipped with exit 0 and `CLEANUP: <workdir> (skipped - not a superdev run dir)`; `tests/superdev/cleanup-run.test.ts` passes.
