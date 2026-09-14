Title: "commit-task.sh: read the path out of a `touched:` line that carries a reason"


## Goal
`commit-task.sh --notes` declares the path an implementor wrote on a `touched:` line even when that
line also carries a reason after ` - ` or in ` (...)`, so the file is staged and committed instead of
coming back as `undeclared:`; and when the script does refuse a commit, it prints every declared path
it had to drop, so the operator sees that the line's shape was at fault rather than a missing
declaration.

## Context
During a `superbuild` run on a host repo the commit of task 7 was refused with
`undeclared: src/.dockerignore` for a file the implementor had just declared. The notes line was
`- touched: src/.dockerignore - wiersz \`!backend/.../CatalogItem.cs\` na koncu listy ...`. The
`touched:*` branch of `commit-task.sh` (lines 231-234) passes the whole remainder of the line to
`add_declared`, unlike the task-file branch (line 217) which strips a trailing ` (<symbol>)`;
`normalise_path` (lines 146-164) only trims whitespace, backticks, a `./` prefix and a trailing `/`.
The resulting pseudo-path matches no file, is silently dropped by the `stageable` loop (lines
255-270), and `is_declared` then misses the real path. The script is fail-closed, so nothing was
committed and nothing was lost - but the operator had to re-declare the file by hand. This repo is
the plugins' source: editing bash/markdown IS shipping, there is no build step, and script
regressions live in `tests/superdev/commit-task.test.ts` (14 cases, green today).

## Out of scope
- Rescuing a reason appended with no ` - ` and no ` (` separator (e.g. `touched: a.txt bo tak`).
- A path whose own name contains ` - ` or ` (` is truncated at that separator - accepted trade-off.
- Changing the fail-closed behaviour, the exit codes, or the `undeclared:` output shape.
- The task-file `### Files` parsing branch (line 217) - it already strips its comment.

## Acceptance criteria
1. On a run that refuses the commit (exit 2), every declared path the `stageable` loop dropped is
   printed on stdout as `dropped: <path>`; the `undeclared:` lines and the stderr error are
   unchanged.
2. No run that exits 0 prints a `dropped:` line.
3. A notes line `- touched: sub/extra.txt - <reason>` declares `sub/extra.txt`: the file is staged
   and lands in the commit, exit 0.
4. A notes line `- touched: sub/extra.txt (<comment>)` declares `sub/extra.txt` the same way.
5. A bare `- touched: sub/extra.txt` keeps behaving exactly as it does today, and a path containing
   a space is still declared whole.
6. A `touched:` value that reduces to an empty path after the cut declares nothing - a refused run
   prints no `dropped:` line for it.
7. `commit-task.sh`'s header contract documents both the `dropped:` output and the cut rule.
8. `superdev/agents/superbuild-task-implementor.md`,
   `superdev/agents/simplebuild-task-implementor.md` and `superdev/references/review-contract.md`
   each state that the `touched:` line is machine-read, carries the path alone, and that the reason
   belongs on its own line.
9. `node --test "tests/**/*.test.ts"` is green from the repo root.

