
## Task 6 - Remove the simplebuild reviewer's early return on misalignment
- Covers: `full simple sweep` (#8)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Route the three build reviewers through the hybrid gate` (Task 5) - blocks: both tasks edit `superdev/skills/simplebuild-reviewer/SKILL.md`

### Files
- modify - superdev/skills/simplebuild-reviewer/SKILL.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Delete the sentence "On any misalignment: STOP. Write the report (misalignment under Critical), emit the verdict line, and return immediately - do not run the checks below. They only apply once the plan is met."
2. Replace it with the rule that a misalignment is recorded as an ordinary Critical finding and the review continues through every remaining axis, so the Simple track matches the Super track, where no reviewer carries an early return.
3. Change nothing else in the file - the gate paragraph is owned by `Route the three build reviewers through the hybrid gate` (Task 5) and the verdict channel stays the two lines it has today.

### Failure modes
- when the delivered change misaligns with the plan -> response record it under Critical and carry on through the code-quality, architecture, test and production-readiness axes plus the stage's own mandate, log the report file named by the `report:` label, test none - the skill body is prose and the repo has no harness for skill bodies
- when a misaligned change makes a later axis unreviewable (the code under review is slated to be thrown away) -> response report that axis as unreviewable in the report's notes rather than returning early, log the same report file, test none - same reason

### Contracts
- none - the reviewer's input labels, output lines and verdict set are unchanged.

### DoD
`superdev/skills/simplebuild-reviewer/SKILL.md` carries no instruction to return before the remaining checks, and a misalignment is specified as an ordinary Critical; the suite stays green.


### Covered criteria
8. full simple sweep - `simplebuild-reviewer` runs every axis at every stage and reports a plan misalignment as an ordinary Critical, with no sentence instructing it to return early.
