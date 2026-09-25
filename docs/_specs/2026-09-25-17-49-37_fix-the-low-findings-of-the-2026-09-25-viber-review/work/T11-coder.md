# T11 - notes

Changed only the `dispatch_with` assignment on the planner branch (the `if [ -n "$skill_line" ]`
arm) to `"the plan path, \`refs:\` (the reference directory) and \`memory:\` (the planner's
resolved config value), as planner-review.md expects its input"`. That variable already feeds
every planner-branch deny message (no-dispatch, no-verdict-yet is the one exception - see below,
DENIED, non-PASS, tamper), so all of them now name the three inputs `planner-review.md` expects,
with one edit.

Deliberately left the "returned no 'VERDICT:' line" message (the shared code after the if/else,
used by both branches) untouched: it never used `${dispatch_with}` before, and adding it there
would also change the plain-plan-review branch's wording on that path, breaking DoD.2 ("the
plain-plan-review refusal is unchanged").

New test: "the planner refusal names refs: and memory:, as planner-review.md expects its input"
in tests/viber/plan-gate.test.ts, watched RED (missing `refs:`) before the fix, GREEN after.

Full `tests/viber/plan-gate.test.ts` run: 54/54 pass. A wider `tests/viber/*.test.ts` run shows
one unrelated failure in `plan-path.test.ts` - that script and its test file are mid-edit by
another in-flight task (not T5, not in my Files), so it is not this task's to fix.
