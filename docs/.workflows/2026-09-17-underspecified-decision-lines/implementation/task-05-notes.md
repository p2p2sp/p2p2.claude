# Task 5 notes

## Runs
- grep -n "UNDERSPECIFIED:" superdev/agents/superbuild-task-reviewer.md -> exit 0
- grep -n "DECISION:" superdev/agents/superbuild-task-reviewer.md -> exit 0

Step 1: the `notes` bullet names both lines and cites `references/review-contract.md`'s `## Notes line formats` as their definition, adding that this agent gets no `refs:` label and reads no file for them (contract lines 12-14 say the task reviewer never reads it) - a bare pointer would otherwise read as an instruction to open that file.
Step 2: the three steps are sub-bullets of the one `Decisions judged` bullet rather than one run-on line; the `DECISION:` rule sits in the trailing paragraph of the same bullet.
Step 2 (c): B18-B20 are cited by class number with their subject in words, so the agent needs no access to `plan-review-checklist.md`.
CARRY: superdev/references/review-contract.md - `## Implementor stop` leaves an answered `DECISION:` line in the notes file across a re-dispatch ("a notes file appended to across re-dispatches keeps the earlier stop's lines, and those are closed") and marks it in no way; the per-task reviewer has no `decisions:` input, so `## Check`'s `DECISION:`-in-a-closed-task rule raises an Important on a stop the user already answered. Needs either a closure marker on the line or a `decisions:` label for this gate.
