# Fix round 01 - findings from implementation/review-01.md

`implementation/decisions.md` (C1, accepted 2026-09-16) narrows this round's fix: the two
pre-existing working-tree files (`docs/.workflows/2026-09-16-adr-in-planning/spec.md`,
`docs/.workflows/20260908-intent-spec-in-run-dir-intent.md`) staying in commit `8761271` is
accepted, not reverted and not split into a follow-up commit - only the inaccurate CARRY line in
`task-01-notes.md` is corrected here, per the decision's own wording ("corrected separately in
this round's fix").

Corrected `task-01-notes.md` line 7: it previously claimed the deletion of
`docs/.workflows/20260908-intent-spec-in-run-dir-intent.md` was "left in place and deliberately
not declared, so the task commit does not stage it" - `git show 8761271 --name-status` shows the
opposite (`D docs/.workflows/20260908-intent-spec-in-run-dir-intent.md` and
`M docs/.workflows/2026-09-16-adr-in-planning/spec.md` are both part of that commit, alongside
`M superdev/references/review-contract.md`). The line now states both files were staged and
committed in `8761271` per the user's commit-gate choice, adds a `touched:` line for each, and
points at `decisions.md` C1 for the accepted record.

touched: docs/.workflows/2026-09-16-reviewer-gates-through-executor/implementation/task-01-notes.md

## Finding status

C1: fixed - no test: the fix is a prose correction to a historical notes file
(`task-01-notes.md`); no script executes or asserts on that file's content, and the revert/split
half of the original how-to-fix is superseded by `decisions.md` C1. Verified instead with
`grep -n "does not stage it" task-01-notes.md` (one match before the edit, no match after) and
`git show 8761271 --name-status` (confirms both files were staged and committed by that commit,
matching the corrected text).
