# Final review - slice 1 (T1-T8)

## Blocking

None.

## Minor

1. `viber/skills/implementor/SKILL.md:38` - the `retry` answer after a `FAIL` still says "the round counter continues, the next 3 rounds counting as 1 to 3 of 3". That 3-round cap is gone. Review rounds now rise with every review (line 130), the only cap is the 5-attempt limit (line 141), and the one question that still offers `retry` after a `FAIL`, the owner-marked `DECIDE:` question, starts the task's attempt count over (line 157). So the clause contradicts the attempt rules the orchestrator follows. T7's coder notes (`work/T7-coder.md`) say this wording was left as is. Fix: replace the clause with "the task's attempt count starts over", or remove it.

2. `viber/scripts/commit-task.sh:84-86` - the `--review` header still says the fix is "rechecked or accepted by the user" and that the form "runs once, after every fix round". The final review now has exactly one fix round, and a failed recheck is accepted by the arbiter's ruling, not by the user (`viber/skills/implementor/fragments/final-review.true.md:40-46`). Fix: "rechecked, or accepted by the user or by an arbiter ruling" and "after the fix round".

3. `viber/scripts/commit-task.sh:130-131` - the `status.md` key comments still read "`--skip`, the user dropped that task" and "`--unreviewed`, the user waived the review gate". An arbiter `cap` ruling now makes both calls too (`viber/skills/implementor/SKILL.md:159`). Fix: "the user or an arbiter ruling dropped that task" and "the user or an arbiter ruling waived the review gate".
