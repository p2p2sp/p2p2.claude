# Final review - slice 2 (T9, T10)

## Minor

1. viber/skills/setup/assets/viber-flow-en.svg:372 and viber/skills/setup/assets/viber-flow-pl.svg:372
   - What is wrong: the task-reviewer note says a finding goes back to the coder "up to 3 rounds, then the arbiter rules" ("do 3 rund, potem orzeka arbiter"). There is no 3-round review limit any more: review failures count toward the task's 5 attempts, together with coder failures and refused commits.
   - Proof: viber/skills/implementor/SKILL.md:141 ("A task gets at most 5 attempts ... a coder failure, a review failure and a task commit exiting other than 4 each end one"), :164 (reviewer FAIL on attempt 1 to 4 -> next attempt), :159 (reviewer FAIL on attempt 5 -> arbiter `cap`). Spec S2 and criterion 5 say the same, and help.html:1225 and :1654-1657 already describe the 5 attempts.
   - Fix: EN -> "a finding goes back to the coder, within the task's 5 attempts, then the arbiter rules". PL -> "uwaga wraca do codera, w ramach 5 prób zadania, potem orzeka arbiter". Keep each line inside its 460px box.

2. viber/skills/setup/assets/viber-flow-en.svg:413 and viber/skills/setup/assets/viber-flow-pl.svg:413
   - What is wrong: the final test-runner note says a failure goes to a repair coder "up to 3 rounds, then the arbiter rules" ("do 3 rund, potem orzeka arbiter"). The build now runs 5 repair rounds, and the arbiter rules on the sixth failed run.
   - Proof: viber/skills/implementor/SKILL.md:189-190 (test-runner FAIL on round 1 to 5 -> repair; round 6 -> arbiter `case: tests`). Spec S6 and criterion 10 say the same, and help.html:1689 and :1525-1531 already describe six runs.
   - Fix: EN -> "a failure goes to a repair coder, up to 5 rounds, then the arbiter rules". PL -> "porażka trafia do codera naprawczego, do 5 rund, potem orzeka arbiter".
