# Owner decisions

Read before touching the owner decision channel: `implementor` step 4's answers, `commit-task.sh
--decide`, the `decision:` line each coder and reviewer dispatch carries, and `closeout`'s
deviation marking.

- `implementor` offers `decide` beside retry/skip/abort on a task's third coder failure, beside
  retry/accept/abort on its third failed review round, or at once beside retry/skip/abort
  whatever the attempt count when a coder's `DECIDE:` options are all owner-marked; never on a
  coder or reviewer `VERDICT: DENIED`. It is the user's own free-text reply to the question, never
  a listed option (`AskUserQuestion` always offers a free-text field). The first coder failure on
  a task is still retried without asking; the second, when it offers an option not owner-marked,
  gets the implementor's own automatic decision instead of a question (below), never a retry.
- An automatic decision is the implementor's own ruling, taken without asking once a coder's
  second failure offers an unmarked option: recorded `auto: <option>` through the same
  `commit-task.sh --decide` call as the owner's, it restarts neither failure counter, is carried
  to the final summary, and `closeout` marks the deviation it causes exactly as for an owner's.
- The answer is rewritten of every double quote, dollar sign, backtick and backslash into words,
  then recorded with `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>" "<id>"
  "<text>"`: one non-empty, single-line `text`, no commit (it waits in `status.md` for whichever
  commit comes next, like `--skip`), refused on a task already done or skipped or on empty or
  multi-line text, the same text recorded twice for one task kept once.
- `implementor` then sends that task's coder back at the same tier, fresh, with the new
  `decision:` line among its lines. Both failure counters restart: the next coder failure on that
  task is retried once without asking, and the next review round is 1 of 3.
- `plan-index.sh` prints every `decision: <id>: <text>` line of `status.md` verbatim, in file
  order; a status file with none prints exactly as it did before the line existed. `implementor`
  passes a `decision:` line to a task's coder and reviewer whenever its `<id>` is that task or any
  task it depends on, directly or transitively - the index's `deps` is the only source for that
  walk. Both let the decision override the task file: a `DoD` clause it settles counts as met once
  the work follows it.
- `closeout` reads every `decision:` line of `status.md` after the coders' and reviewers' notes,
  and marks a deviation where one makes a sentence of `spec.md` false, exactly as for any other
  deviation source.
