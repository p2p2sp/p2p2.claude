Skip this step when the index's `closed:` line names `final-review`, the build ended on `abort`, or no task was committed this run.

`TaskCreate` a "final review" entry; its `TaskUpdate` -> completed lands once every dispatch below has returned, committed or been accepted. As an exception to the skill's rule that only coder, reviewer and repair-coder dispatches carry `model`, both dispatches of this step carry it.

Cut every task of the index, in index order, skipped ones included, into groups of at most 8 consecutive tasks, one group per slice.

Dispatch one `viber:final-reviewer` (Agent tool, `model` opus clamped into the tiers range) per slice, all in one message, each carrying:

```
run: <dir>
tasks: <the slice's task ids, comma-separated>
report: <dir>/work/final-review-<slice number>.md
refs: ${CLAUDE_PLUGIN_ROOT}/references
memory: <the config block's memory value>
```

- `VERDICT: DENIED` -> `AskUserQuestion` naming that slice: retry / accept / abort.
- No reviewer returned `VERDICT: FAIL` -> complete the entry and skip the rest of this step.
- Any reviewer's `VERDICT: FAIL`, once every reviewer above has returned, been retried or been accepted -> dispatch `viber:task-coder` (Agent tool, `model` sonnet clamped into the tiers range) once, carrying:

```
spec: <dir>/spec.md
review: <a FAIL reviewer's REPORT path>, one `review:` line per such reviewer
notes: <dir>/work/final-fix-coder.md
out: .temp/viber/final-fix/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

- `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept / abort.
- A `FILES:` line on `PASS` or `FAIL` -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --review "<plan>" "<file>" ["<file>"...]` naming every path it holds.
- No `FILES:` line -> no commit.

Never a second round of review or fix: the fix coder dispatches at most once, and nothing reviews its fix.

Complete the entry. Carry to the final summary: every `OWNER:` line any reviewer returned, the fix coder's `REASON:` on `FAIL`, and every refusal accepted through this step.
