Skip this step, completing its `Final review` entry, when the index's `closed:` line names `final-review`, the build ended on `abort`, or no task was committed this run.

The `Final review` entry's `TaskUpdate` -> completed lands once every dispatch below has returned, committed or been accepted. As an exception to the skill's rule that only coder, reviewer and repair-coder dispatches carry `model`, every dispatch of this step carries it.

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
- Any reviewer's `VERDICT: FAIL`, once every reviewer above has returned, been retried or been accepted -> fix round 1: dispatch `viber:task-coder` (Agent tool, `model` sonnet clamped into the tiers range), carrying:

```
spec: <dir>/spec.md
review: <a REPORT path this round fixes>, one `review:` line per such report
notes: <dir>/work/final-fix-coder-<round>.md
out: .temp/viber/final-fix/
refs: ${CLAUDE_PLUGIN_ROOT}/references
decision: final-review: <text>, one line per answer in the user's own words given so far
```

- Round 1 fixes every FAIL reviewer's `REPORT`; a later round only the last recheck's `REPORT`.
- Fix coder `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept / abort; `accept` in a later round commits the fix, its refused call named in the final summary.
- The fix is every `FILES:` path this step's fix coders returned so far. None -> no recheck and no commit.
- Otherwise dispatch one `viber:final-reviewer` (Agent tool, `model` opus clamped into the tiers range) to recheck the fix, carrying:

```
run: <dir>
fix: <the fix paths, comma-separated>
review: <a REPORT path>, one `review:` line per report this step wrote so far, slice and recheck alike
report: <dir>/work/final-review-recheck-<round>.md
refs: ${CLAUDE_PLUGIN_ROOT}/references
memory: <the config block's memory value>
decision: final-review: <text>, the same lines the fix coder carried
```

- Recheck `VERDICT: PASS` -> commit the fix.
- Recheck `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept / abort; `accept` commits the fix, its refused call named in the final summary.
- Recheck `VERDICT: FAIL` -> `AskUserQuestion` naming its `REPORT`: retry / accept, naming an answer in the user's own words as the way to give their own fix, never as an option to pick.
- `retry` on that question -> the next round, its fix coder one tier up from the last, never past `tiers.max`.
- `accept` on that question -> commit the fix, the recheck's `REPORT` path named in the final summary.
- An answer in the user's own words -> the next round at the same tier, that answer copied as one more `decision: final-review:` line.
- Commit the fix: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --review "<plan>" "<file>" ["<file>"...]` naming every fix path.

Complete the entry. Carry to the final summary: every `OWNER:` line any reviewer or recheck returned, every fix coder's `REASON:` on `FAIL`, every accepted recheck `REPORT`, and every refusal accepted through this step.
