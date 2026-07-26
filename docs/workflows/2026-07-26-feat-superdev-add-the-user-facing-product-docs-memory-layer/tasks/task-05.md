
## Task 5 - feat(superdev): add docs-divergence touchpoints to the entry interview and both planners
- Covers: criteria #5
- TDD: none

### Dependencies
- none - blocks: none

### Files
- modify - superdev/skills/superdev/SKILL.md (Explore first section)
- modify - superdev/skills/superplan/SKILL.md (Self-Review section)
- modify - superdev/skills/simpleplan/SKILL.md (Self-Review section)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -q 'docs/product' superdev/skills/superdev/SKILL.md && grep -q 'docs/product' superdev/skills/superplan/SKILL.md && grep -q 'docs/product' superdev/skills/simpleplan/SKILL.md && echo OK` - prints `OK`

### Approach
- superdev Explore first: add one bullet - when the host repo carries `docs/product/`, have one of the parallel Explore agents read the affected feature's doc(s); docs are user intent, so any doc-vs-code divergence is reported into the interview as an open requirement (fix the code or, only on the user's explicit choice, amend the doc) - never treated as text the code overrides.
- superplan Self-Review: add one Verify bullet - when the host repo carries `docs/product/`, verify the plan does not contradict the affected feature's doc; a contradiction is an unresolved design decision -> STOP, run `superdev` skill.
- simpleplan Self-Review: the same Verify bullet, inserted alongside the existing Verify bullets.

### Edge cases
- Host repos without `docs/product/` see zero behavior change (every bullet is conditional on the directory's presence).
- Planners have `disallowed-tools: Bash, Task, Agent`, so the bullets must direct Read/Grep/Glob checks only - no agent fan-out, no commands.

### Contracts
- none

### DoD
All three SKILL.md files carry their conditional `docs/product` bullet; grep assertion green.


### Covered criteria
5. `superdev/skills/superdev/SKILL.md` Explore-first carries a docs-divergence bullet (docs are user intent; divergence enters the interview as an open requirement), and `superdev/skills/superplan/SKILL.md` and `superdev/skills/simpleplan/SKILL.md` each carry one Self-Review Verify bullet checking the plan against `docs/product/` for the affected feature.
