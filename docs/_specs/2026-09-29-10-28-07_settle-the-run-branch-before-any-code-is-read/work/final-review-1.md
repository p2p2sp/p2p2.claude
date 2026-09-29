# Final review - slice 1 (T1, T2, T3, T4, T5)

Tests: `node --test tests/viber/plan-path.test.ts tests/portability.test.ts tests/viber/help.test.ts` passes 298/298, and `tests/orphan-tags.test.ts` and `tests/viber/switch-text.test.ts` pass 29/29. All three findings of `work/review-T4-1.md` are fixed in the committed tree.

## Blocking

None.

## Minor

1. viber/skills/setup/templates/viber.yml:61 (and the same generated comment in .claude/viber.yml:51). The `branching.mode` comment still reads "allowed (the plan offers a branch and you confirm it)". After this run the entry is settled when `intent` or `fixer` starts, and the planner takes the branch from that hand-off without asking (planner/fragments/branching.allowed.md:3-4). The comment also says nothing about the new `required` rule that no run commits onto any entry base. `viber/README.md:110-114` and `viber/BRANCHING.md:19-22` were rewritten for the same sentence, so these copies are now the only places that still describe the old moment. Setup writes this template into every host's `.claude/viber.yml`. Fix: reword the comment to match README.md, for example "allowed (the run may get its own branch, settled when the interview or diagnosis starts) or required (a run always gets its own branch, never an entry's base)". Apply it to the template and to this repo's `.claude/viber.yml`.

2. viber/BRANCHING.md:125-126 (Trunk based development example). The text says "`allowed` means you still confirm the branch each run rather than always getting one". That is no longer true for this one-entry example. With a single usable entry, `--start` prints it as `suggested:` (run-branch.sh branch_start). Both `allowed` start fragments then take it "without a question" (intent/fragments/branching-start.allowed.md:6, fixer/fragments/branching-start.allowed.md:5), so "no branch" is never offered. The planner then writes the entry's `new:` name without asking (planner/fragments/branching.allowed.md:4). A run at the base always gets its own branch. Fix: describe what `allowed` gives here now. One option: "`allowed` leaves the choice to you only when the start check finds you off `main`, where you can stay on your current branch". Another: "use `required` if every run should get a branch". Either way, drop "you still confirm the branch each run".
