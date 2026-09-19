# task review

## Findings

### Critical

- C1 - Task 1's own commit deletes 26 unrelated prior workflow runs and edits an unrelated rules file - 543615f (e.g. `docs/.workflows/2026-09-02-fix-superdev-make-an-approved-plan-carry-its-own-file-path-across-the-context-reset/plan.md`, `.claude/rules/_common.md:10`) - what is wrong: the commit that carries Task 1 (`git show --name-status 543615f`) removes ~535 files across 26 prior superdev run directories under `docs/.workflows/` (`2026-09-02-fix-superdev-...` through `2026-09-17-vibe-track`) and adds the line `When work with skills or agents ALWAYS use skill-designer rules.` to `.claude/rules/_common.md`. Task 1's `### Files` names only `add - docs/misc/review-contract-rule-inventory.md`, and neither deletion nor rules-file edit is mentioned in its `### Approach`, `### Contracts` or `### DoD`; the task's notes (`task-01-notes.md`) record neither as a `touched:` line, a `CARRY:` line nor anywhere else - why it matters: `docs/.workflows/` is the repo's own record of past superdev build runs (root `CLAUDE.md`: "Working dirs of superdev builds run ON this repo"), and wiping 26 of them destroys that history; `.claude/rules/_common.md` is a global dev-time rule every future planning session reads, and this task's own text gives no reason to change it. Nothing in `## plan-header`'s scope or in Task 1's approach calls for either action, so this is scope creep beyond what a fix can be judged to have intended - why it matters twice over: an unrecorded deviation of this size is exactly the failure mode `## Check`'s "Notes honest" bullet exists to catch - how to fix: in a follow-up commit, restore the 26 deleted `docs/.workflows/<run>/` directories and revert the added line in `.claude/rules/_common.md`, leaving Task 1's diff to the `docs/misc/review-contract-rule-inventory.md` addition (plus the run's own workdir bookkeeping, which is out of scope for this review).

## Assessment

The inventory file itself (`docs/misc/review-contract-rule-inventory.md`) meets Task 1's `### DoD` and serves criterion 9 - every rule of the pre-change `review-contract.md` is accounted for as kept, moved or dropped with a reason - but the commit that delivers it also destroys 26 unrelated prior build records and edits an unrelated global rules file, neither authorized by the task's text nor recorded in its notes.

VERDICT: FAIL
