
## Task 2 - Teach the plan review rubric the TDD Commands section
- Covers: `Presence rule` (#2)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the TDD Commands section to both plan templates` (Task 1) - blocks: the rubric names a section that must already exist in the templates.

### Files
- modify - superdev/references/plan-review-checklist.md (stack-agnostic section list, B2, B6, Author self-check)
- modify - superdev/skills/superplan/SKILL.md (Self-Review)
- modify - superdev/skills/simpleplan/SKILL.md (Self-Review)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c 'TDD Commands' superdev/references/plan-review-checklist.md)" -ge 4` - exits 0
- `test "$(grep -c 'TDD Commands' superdev/skills/superplan/SKILL.md)" -ge 1` - exits 0
- `test "$(grep -c 'TDD Commands' superdev/skills/simpleplan/SKILL.md)" -ge 1` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. In `superdev/references/plan-review-checklist.md`, add `` `### TDD Commands` `` to the stack-agnostic section enumeration that runs from `### Files` to `Covers:`.
2. Extend B6 (`Missing or invalid task marker`) with the presence rule tied to the `TDD:` marker: a `TDD: required` task carrying no `### TDD Commands` section, a `TDD: none` task carrying one, or a section line whose path is not declared under that task's `### Files`, is B6, settled by reading the task's marker line and its two sections.
3. Extend B2 (`Build/test command mismatch`) so a command in `### TDD Commands` is checked against the repo's real tooling on the same terms as one in `### Test Commands`.
4. Add one `## Author self-check` bullet mirroring step 2's rule.
5. In `superdev/skills/superplan/SKILL.md` and `superdev/skills/simpleplan/SKILL.md`, extend the Self-Review bullet that already names `### Test Commands` so it names `### TDD Commands` beside it.

### Failure modes
- none - rubric

### Contracts
- none

### DoD
The checklist enumerates the new section, B6 carries the presence rule, B2 covers the new commands, `## Author self-check` mirrors B6, and both planner Self-Review bullets name the section; every command above exits 0; the test suite is green.


### Covered criteria
2. Presence rule - The plan review rubric lists `### TDD Commands` among the plan's task sections, flags a `TDD: required` task without it and a `TDD: none` task carrying it, checks each line's path against that task's `### Files` and each command against the repo's real tooling, and both planners' self-review lines name the section.
