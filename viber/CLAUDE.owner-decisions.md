# Owner decisions

Read before touching the owner decision channel: `implementor` step 4's answers, `commit-task.sh
--decide`, the `decision:` line each coder and reviewer dispatch carries, and `closeout`'s
deviation marking.

- `implementor` offers `decide` beside retry/skip/abort on a task's second coder failure and
  beside retry/accept/abort on its second failed review round, never on a coder or reviewer
  `VERDICT: DENIED`; it is the user's own free-text reply to the question, never a
  listed option (`AskUserQuestion` always offers a free-text field). The first coder failure on a
  task is still retried without asking.
- The answer is rewritten of every double quote, dollar sign, backtick and backslash into words,
  then recorded with `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>" "<id>"
  "<text>"`: one non-empty, single-line `text`, no commit (it waits in `status.md` for whichever
  commit comes next, like `--skip`), refused on a task already done or skipped or on empty or
  multi-line text, the same text recorded twice for one task kept once.
- `implementor` then dispatches that task's coder again at the same tier, carrying the new
  `decision:` line. Both failure counters restart: the next coder failure on that task is retried
  once without asking, and the next review round is 1 of 2.
- `plan-index.sh` prints every `decision: <id>: <text>` line of `status.md` verbatim, in file
  order; a status file with none prints exactly as it did before the line existed. `implementor`
  passes a `decision:` line to a task's coder and reviewer whenever its `<id>` is that task or any
  task it depends on, directly or transitively - the index's `deps` is the only source for that
  walk. Both let the decision override the task file: a `DoD` clause it settles counts as met once
  the work follows it.
- `closeout` reads every `decision:` line of `status.md` after the coders' and reviewers' notes,
  and marks a deviation where one makes a sentence of `spec.md` false, exactly as for any other
  deviation source.
