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
