# Rulings

Read before touching the arbiter or the rulings it records: `implementor` step 4's attempts,
`commit-task.sh --decide` and `--rule`, the `decision:` line each coder and reviewer dispatch
carries, `agents/arbiter.md`, and `closeout`'s deviation marking.

- The build never asks about a stalled task: the `arbiter` rules every coder `DECIDE:` on a
  task's second to fourth attempt, and every task's fifth failed attempt (coder, review or refused
  commit, counted together, never a `WAIT:` hold) as the cap, a `DECIDE:` on it included. A coder
  or reviewer `VERDICT: DENIED` still asks the user.
- An arbiter pick on a stalled coder is recorded twice: as a ruling (`--rule`, below) and as
  `auto: <ruling>`, made one line with every double quote, dollar sign, backtick and backslash
  rewritten into words, through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>"
  "<id>" "<text>"`: one non-empty, single-line `text`, no commit (it waits in `status.md` for
  whichever commit comes next, like `--skip`), refused on a task already done or skipped or on
  empty or multi-line text, the same text recorded twice for one task kept once. The task's coder
  gets it as a `decision:` line without the attempt count restarting.
- `plan-index.sh` prints every `decision: <id>: <text>` line of `status.md` verbatim, in file
  order; a status file with none prints exactly as it did before the line existed. `implementor`
  passes a `decision:` line to a task's coder and reviewer whenever its `<id>` is that task or any
  task it depends on, directly or transitively - the index's `deps` is the only source for that
  walk. Both let the decision override the task file: a `DoD` clause it settles counts as met once
  the work follows it.
- A ruling is any choice the build takes in the user's place, through `commit-task.sh --rule
  <plan> <subject> <ruling> <why> <cost>`: one line `- <subject>: <ruling> | why: <why> | cost if
  wrong: <cost>` in `<run-dir>/rulings.md`, a repeat kept once, refused on an empty or multi-line
  field or a subject that is neither a task id nor `baseline`, `tests`, `final-review` or
  `commit`. It commits nothing: every plan-taking commit form stages the register once it differs
  from HEAD, `archive-run.sh` carries it, and a run with no ruling has no file. Only this step
  writes it - the `arbiter` (`Read`, `Grep`, `Glob`) returns `RULING`, `WHY` and `COST`, never a file.
- The arbiter's `case:` words (`decide`, `cap`, `baseline`, `tests`, `final-review`, `commit`) and
  the option words each case takes are shared by `agents/arbiter.md`, `implementor` step 4 and the
  two fragments; the arbiter's own `VERDICT: DENIED` still asks the user retry/accept/abort.
- `plan-index.sh` prints one `ruling: <register line>` per entry after the decisions; `closeout`
  reads every `decision:` line of `status.md` and every line of `rulings.md` after the coders'
  and reviewers' notes, and marks a deviation where one makes a sentence of `spec.md` false, exactly
  as for any other deviation source.
