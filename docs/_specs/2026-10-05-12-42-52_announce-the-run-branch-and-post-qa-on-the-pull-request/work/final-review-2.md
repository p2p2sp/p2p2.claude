# Final review - slice 2 (T9, T10, T11, T12)

## Blocking

None.

## Minor

1. `viber/skills/setup/assets/help.html:2341` (EN) and `:2349` (PL), planner card - "on an entry's base it asks whether to continue there or stop" says more than the planner does. `viber/skills/planner/fragments/branching.allowed.md` asks continue / stop only under `allowed`, only when no `Work:` line was handed off, every `entry:` line reads `new: -` (no issue to number a name) and `current-is-base: yes`. `branching.required.md` never asks it. Spec S5 and criterion 5 state the same narrow condition. As written, a reader on `develop` with a nameable entry expects a question that never comes. The trailing "the run branch is settled again when the run gains an issue" also reads as the planner's own step, when the re-settle after a saved issue belongs to `intent` / `fixer` (their `branching-start.*.md`). Fix: in both languages, say that under allowed, when no entry can name a branch because the run has no issue and HEAD is on an entry's base, it asks whether to continue on the current branch or stop. Keep the re-settle clause, or attribute it to the interview or diagnosis.

2. `viber/BRANCHING.md:32-34`, "When the branch is settled", first bullet - "the planner, which asks once the run has an issue ... and records no branch without one" still describes the old behaviour that spec Problem/S5 replaced. Recording no branch without asking now holds only when HEAD is on no entry's base (`branching.allowed.md`: `current-is-base: no`). Also, an issue saved at the end of the interview or diagnosis now re-settles the entry in `intent` / `fixer` itself (`branching-start.allowed.md`, last bullet), not first in the planner. The paragraph at lines 52-56 added by T11 contradicts this bullet. Fix: end the bullet with "the planner settles it once the run has an issue", or point to the re-settle bullet and the planner paragraph below, and drop "records no branch without one".
