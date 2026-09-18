# Task 2 - Write run-gate.sh and its test

## Runs
- node --test tests/superdev/run-gate.test.ts -> tests 13, pass 13, fail 0, skipped 0, duration_ms 23495

Approach 5 - every detail block opens with one `COMMAND: <the command>` line ahead of the runner's
lines (nothing of the runner's own output is filtered). `## Gates` case 1 of the review contract has
the reviewer name the failing command in a `### Needs decision` bullet, and a subsection holding
several commands yields several `### <subsection>` blocks that are otherwise indistinguishable.

UNDERSPECIFIED: the red result word on a `## Gates` line - written `red` (`<subsection> - red - <n>s`),
the skeleton giving only the `pass` example and the stdout verdict line being `RED:`.
UNDERSPECIFIED: a selected subsection the gate block does not hold at all - carried as
`none - absent from the plan's ## Gate commands block` and never as red, the same handling Approach 4
gives an explicit `none - <reason>`; a missing declaration says nothing about the tree.
UNDERSPECIFIED: the stdout line of a subsection that is not run - printed as `<subsection>: none`, so
the `<subsection>: <result>` lines match the written file's `## Gates` lines one for one.
UNDERSPECIFIED: whether the script creates `<out-file>`'s parent directory - it does not; a missing
parent is the exit-2 "cannot be written" path, which is what the unwritable-directory case tests.
Callers (Task 6, Task 7) name a file inside the run's existing `implementation/` directory.

Two shapes the next reader of this script should not undo:
- `: 2>/dev/null >"$out_file"` and `} 2>/dev/null >"$out_file"` order the redirections so the shell's
  own "No such file or directory" cannot reach stderr beside the script's single reason line.
- the pre-launch-error case is provoked by a FILE named `.temp` in the run's cwd, which makes the
  runner's own `mkdir -p <cwd>/.temp/superdev/logs` impossible; it is the one portable way in, since
  `command:`, `timeout:` and `expect-exit:` are all fixed by this script.

`tests/superdev/run-gate.test.ts` reads the runner's log by its basename out of `<dir>/.temp/superdev/logs`,
never by the printed `LOG:` path: Git-Bash prints the Windows temp dir as `/tmp/...`, which Node then
resolves against the current drive.
