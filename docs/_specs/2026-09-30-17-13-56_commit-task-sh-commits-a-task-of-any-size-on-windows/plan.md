---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-17-13-56_commit-task-sh-commits-a-task-of-any-size-on-windows/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# commit-task.sh commits a task of any size on Windows

## Goal

`viber/scripts/commit-task.sh` hands a task's whole path list to single git calls, so on Windows (Git Bash, where CreateProcess caps a command line at 32767 chars) a task of roughly 300 or more paths fails with "Argument list too long", exit 5, and nothing is committed; every task of a large move-heavy run fails the same way. Staging also spawns about five git processes per path, so the same call runs for minutes before it fails. The script must commit a task of any size on every OS, with its staging semantics unchanged.

## Acceptance criteria

1. A task commit whose plan `Files:` list is longer than 32767 chars commits every named path, no git command line the script runs is longer than 32767 chars, and every commit form commits through that same bounded commit step.
2. `--landed` records such a task done.
3. The no-change exit 4 and the commit's contents are the same whether a path list fits one git call or several: a change only in the last path of a long list is committed, and a long list with no change exits 4.
4. Staging a task's paths runs fewer git processes than it has paths: the count grows by chunk, never by path.
5. Staging still takes a path in every state it takes today (already staged, removed with `git rm`, tracked under an ignored directory, a literal bracketed name, a directory entry), still refuses an untracked path an ignore rule covers, and still warns `could not stage <path>` for a path git does not know, committing the rest.

## Scope

### File map

- modify - viber/scripts/commit-task.sh - runs every path-list git call in bounded chunks and stages a path list in batches
- modify - tests/viber/commit-task.test.ts - the reproduction rows (already RED in the tree) plus the cases proving the criteria

### Out of scope

- `viber/skills/commit/scripts/commit.sh` paths mode (the user's decision, revising the diagnosis' mirror step): its paths arrive as its own argv, already bounded by the same command-line cap one process earlier, so it keeps committing its named paths in single git calls.
- A path list longer than 32767 chars reaching the fix-number form, `--with`, `--repair`, `--chore`, `--qa`, `--e2e`, `--review` or `--outside`: those paths arrive as the script's own argv, bounded by the same cap one process earlier; these forms still commit through the bounded commit step.
- `warn_unclaimed` and the `--with` claimant loop: they pass paths through pipes and awk, never as a git argv, and keep their behaviour.
- `plan-index.sh`, `archive-run.sh` and every other script: none hands a task's path list to one git call.

## Tasks

<!-- TASK -->
### T1 - Chunk every path-list git call in commit-task.sh
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: none
- Repro: tests/viber/commit-task.test.ts
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: every git call in commit-task.sh that takes a caller-sized path list (the temporary-index commit, both no-change gates, the three `--landed` checks) runs through the chunked runner, so a path list of any length commits or is recorded with the same outcome a short list has today.
- Verification: node --test --test-reporter=dot tests/viber/commit-task.test.ts -> every case passes, the two "runs past" reproduction rows included (each long-list case carries a timeout above the harness default: until batched staging lands, staging a long list takes tens of seconds on Windows)
- DoD: the plain task commit reproduction row exits 0 with `done: T1` in HEAD's status.md; the `--landed` reproduction row exits 0 with `done: T1` in HEAD's status.md; a task commit whose Files list is longer than 32767 chars and whose only change is its last path commits that path; a task commit whose Files list is longer than 32767 chars with no change exits 4 naming `--landed`
<!-- /TASK -->

<!-- TASK -->
### T2 - Stage a task's path list in batches
- TDD: required
- Covers: #4, #5
- Uses: C1, C2
- Depends-on: T1
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the task, fix-number and flag forms stage their named paths through one batched staging step whose git process count grows by chunk, never by path, taking and refusing exactly the paths `stage_path` takes and refuses today; the run's trail files and `rulings.md` keep their per-path staging.
- Verification: node --test --test-reporter=dot tests/viber/commit-task.test.ts -> every case passes, the git-process-count case and every existing staging case included
- DoD: a plain task commit of 60 new paths, run under a git wrapper counting its invocations, runs fewer git processes than it has paths and commits all 60; a task whose Files list holds 60 new paths plus one path neither on disk nor known to git commits the 60 and prints `warning: could not stage <that path>`; a task whose Files list names a directory holding changed files commits every changed file under it; the existing cases for a path removed with `git rm`, a tracked file under an ignored directory, an untracked ignored path and a bracketed literal path pass unchanged
<!-- /TASK -->

## Contracts

### C1 - chunked git runner

File: viber/scripts/commit-task.sh

```
git_paths <git-arg>... -- <path>...
```

- Runs `git <git-arg>... -- <chunk>` once per chunk, the paths split in order into chunks whose joined length (paths plus one separator each) stays at or below 24000 bytes; a single path longer than that forms a chunk of its own.
- Every chunk runs; stdout is the chunks' stdout concatenated in order; the return status is 0 when every chunk returned 0, else the status of the first chunk that did not.
- Environment assignments prefixed to the call (`GIT_INDEX_FILE="$idx" git_paths ...`) reach every chunk's git; `GIT_LITERAL_PATHSPECS=1` stays in force.
- No path at all runs nothing and returns 0, under `set -u` on bash 3.2 as well.
- A path is passed to git as a pathspec, never compared against git's output: a directory entry keeps matching everything under it.
- Git is run by the function itself, never through `xargs`.

### C2 - batched staging

File: viber/scripts/commit-task.sh

```
stage_paths <path>...
```

- Stages every named path the way `stage_path <path>` does today: a tracked path through `add -u`, an untracked one only when no ignore rule covers it, never force-added, never through a plain `git add -A`; a path already staged, removed with `git rm` or tracked under an ignored directory counts as staged.
- A named path may be a directory; it counts as known when git knows any path under it, decided through a pathspec query, never by exact-matching the named path against git's output.
- Prints, one per line in input order, each named path git knows afterwards (in the index or in HEAD); a named path it does not print is one the caller warns about as `could not stage <path>`.
- Returns 0 whether or not every path was staged; a failed batch falls back to `stage_path` per path for that batch.
