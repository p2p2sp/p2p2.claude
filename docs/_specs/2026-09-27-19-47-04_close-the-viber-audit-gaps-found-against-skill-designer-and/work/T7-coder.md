# T7 coder notes

- Followed the exact wording pattern already used by `implementor/SKILL.md` (line 31) and
  `e2e/SKILL.md` (line 77) for the "no verdict returned" re-ask, and matched T6's sibling task
  for the memory skill so all three (memory, rules, planner) read consistently.
- Placed the single shared rule inside step 5 (Audit), phrased to cover step 6 (the writer call)
  too ("here or in step 6"), rather than duplicating it in both steps, per DoD.2's "one rule".
- No test files exist for this skill's prose; verification is the two grep counts named in the
  task, both run and confirmed green.
