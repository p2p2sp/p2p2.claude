
## Task 1 - Add the TDD Commands section to both plan templates
- Covers: `Section in both templates` (#1)
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/templates/plan.md (### TDD Commands)
- modify - superdev/skills/simpleplan/templates/plan.md (### TDD Commands)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c '^### TDD Commands$' superdev/skills/superplan/templates/plan.md)" -eq 1` - exits 0
- `test "$(grep -c '^### TDD Commands$' superdev/skills/simpleplan/templates/plan.md)" -eq 1` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. In `superdev/skills/superplan/templates/plan.md`, insert a new section between the `#### Tests` block and `### Approach`, separated by one blank line on each side, with exactly this body:
   ```markdown
   ### TDD Commands
   - <test file path> - <command that runs only that file>
   <one line per test file this task writes; present ONLY on a `TDD: required` task and omitted entirely on `TDD: none`; every path is one this task declares under `### Files`; the command is literal and runnable as written - no placeholder, no filter to be filled in later - and where the host's runner cannot scope to a single file it carries the narrowest scope that does exist>
   ```
2. Insert the identical section, byte for byte, at the same position in `superdev/skills/simpleplan/templates/plan.md`.
3. Leave every `<!-- TASK -->` / `<!-- /TASK -->` marker and every other section untouched, and add the section nowhere else.

### Failure modes
- none - template

### Contracts
- The `### TDD Commands` section shape: one `<test file path> - <command>` line per test file, each path declared under the same task's `### Files`, present only on a `TDD: required` task - consumed by `Teach the plan review rubric the TDD Commands section` (Task 2), `Keep TDD Commands out of the gate contract` (Task 3) and `Run the TDD cycle on the focused command` (Task 4).

### DoD
Both templates carry `### TDD Commands` between `### Test Commands` and `### Approach` with identical body text; both commands above exit 0; the test suite is green.


### Covered criteria
1. Section in both templates - Both plan templates carry `### TDD Commands` immediately after `### Test Commands` and before `### Approach`, holding one `<test file path> - <command>` line per test file, annotated as present only on a `TDD: required` task.
