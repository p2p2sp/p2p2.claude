
## Task 3 - Keep TDD Commands out of the gate contract
- Covers: `Not a gate` (#3)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the TDD Commands section to both plan templates` (Task 1) - blocks: the contract names a section that must already exist in the templates.

### Files
- modify - superdev/references/review-contract.md (stack-agnostic section list, ## Gates)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c 'TDD Commands' superdev/references/review-contract.md)" -ge 2` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. Add `` `### TDD Commands` `` to the stack-agnostic section enumeration in the file's opening block, beside `### Test Commands`.
2. In `## Gates`, directly under the three-bullet list of gate commands and above the exact-string dedup rule, add one sentence: a task's `### TDD Commands` section is never a gate - it belongs to the TDD cycle of the implementor writing that task, no stage collects it, and a command appearing there and nowhere else runs at no stage of a review.

### Failure modes
- none - contract

### Contracts
- none

### DoD
`review-contract.md` enumerates the new section and its `## Gates` section states the exclusion; the command above exits 0; the test suite is green.


### Covered criteria
3. Not a gate - `references/review-contract.md` lists `### TDD Commands` among the task sections it refers to and states in `## Gates` that it is never collected as a gate command.
