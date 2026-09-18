# task review

## Findings

### Important

- I1 - Fourth checkpoint dispatch reason - superdev/skills/superbuild/SKILL.md:166 - a resume inside a checkpoint window is made a reason to dispatch `superbuild-reviewer-change` on its own ("counts as a reason too"), beside the three the task states, and the notes record it as an `UNDERSPECIFIED:` decision - but criterion `Ocena checkpointu tylko gdy jest powód` (criterion 7) reads "wyłącznie wtedy, gdy" those three hold, so a resumed window whose tasks all passed their per-task review and whose gate set is green now runs a round the criterion forbids. Why it matters: it is the one criterion that bounds the checkpoint cost, and the added reason fires on every resume inside a window, which is the common case in a long build. How to fix: keep the dispatch set to the three stated conditions and derive them from persistent state instead of session memory - condition 2 from disk (`task-NN-review-R.md` exists only for a FAIL or a BLOCKED, per the per-task reviewer's output format) and condition 3 from the index's `<review>` column - and where a genuinely unrecoverable value remains (the user's `skip reviewer` answer), say that it is read as condition 3 holding, rather than adding a reason of its own.
- I2 - Fix-the-plan commit misses task Files - superdev/skills/superbuild/SKILL.md:143 - the **fix the plan** commit of `### Task gate blocked` runs `commit-task.sh "<task title>" --notes <workdir>/implementation/task-NN-notes.md` with "the task file not passed a second time", but that re-dispatch is a TASK-mode implementor call (same `task: <task-file path>`, not a findings report), and a task-mode implementor writes a `touched:` line only for a file changed OUTSIDE the task's `### Files` (`superdev/agents/superbuild-task-implementor.md:82`). The declared set is then the notes' `touched:` lines plus the run dir, so the task's own `### Files` edits are undeclared and the call exits 2 on exactly the files the fix just wrote. Why it matters: Approach 6 adds this commit so those edits do not "sit uncommitted and surface as `undeclared:` on the next task's commit", and as written it hits the undeclared prompt every time instead of committing. How to fix: pass the task file to this call - `commit-task.sh "<task title>" <task-file> --notes ...` - as step 4 of `### Loop` does; the deferred-FAIL commit at line 125 needs no task file because that dispatch is fix mode, whose notes declare every file changed.

## Notes

NOTE: plan defect - the `run-gate.sh` non-zero-exit failure mode offers "dispatch the reviewer without a gate block", and the diff renders it faithfully (line 161: omit the `gates:` line, read the round as `RED: yes`), but `gates` is a required label on all three build reviewers and an absent or empty one is an input error returning `VERDICT: FAIL` / `REASON: missing input gates` (`superdev/agents/superbuild-reviewer-change.md:23,28`). That option can therefore only land in the `## Harness pre-check` no-report state; it is an indirect retry/abort, not a third answer.

NOTE: plan defect - the re-review gate file name Approach 8 dictates, `gates-<closing stage>-reR.md` (line 183), carries no round ordinal, while the task's `### Contracts` line says the ordinal is "read off disk like every other ordinal of this build". With R taken from the report's own re-review ordinal ("the same R names the gate file"), checkpoint 02's first re-review writes `gates-checkpoint-re1.md` over the block checkpoint 01's first re-review wrote. Only the record is lost - no round reads a stale one - but the two plan lines disagree about which ordinal names the file.

## Assessment

The seven-step loop, the deferral rule, the conditional checkpoint dispatch and the single gate run per round are all delivered, but one commit call cannot stage what it is meant to stage and one added dispatch reason exceeds criterion 7.

VERDICT: FAIL
