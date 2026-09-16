# task review - task-04-review-1

## Notes
- NOTE: plan defect - the direct-Bash rewrite drops the old explicit `timeout:` guidance ("generous enough for the host's slowest documented suite") with nothing in its place, and the task's `### Failure modes` has no entry for a run the `Bash` tool cuts off at its default timeout. Such a run is neither "cannot start" nor a test red, so both agents would feed it into the 5-round fix loop. Approach step 4 prescribed the replacement text verbatim and named no timeout rule, so this is a plan gap, not an implementation defect; worth one sentence in a later task or at the final review.
- `superdev/references/review-contract.md` `## Notes line formats` is the documented owner of the implementor notes shapes and still lists only `touched:` / `CARRY:` / status / `UNDERSPECIFIED:` / `no deviations`; no task in this plan adds `## Runs` there (Task 6 only teaches the per-task reviewer to read it). Outside this task's `Files`, so not a finding here, but the contract and the notes file now disagree.

## Assessment
Both implementors run `#### Build` and the `### Task Tests` lines as direct `Bash` calls, carry the direct RED/GREEN cycle, the fix-mode scope, the `## Runs` section and no `run.sh` / `runner:` / `superdev:executor` / `LOG:` / `RESULT:` reference; the task's greps and lints exit as listed, the suite is green (537 pass), the diff stays inside the two declared files, and all three notes entries match what the diff shows.
VERDICT: PASS
