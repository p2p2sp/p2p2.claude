
## Task 3 - docs(superdev): state that the touched line is machine-read
- Covers: criteria #8, #9
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 2 - blocks: the wording states the grammar Task 2 implements

### Files
- modify - superdev/agents/superbuild-task-implementor.md (the `touched: <repo-relative path>`
  bullet under `## 3. Record notes`)
- modify - superdev/agents/simplebuild-task-implementor.md (the `touched: <repo-relative path>`
  bullet under `## 4. Record notes`)
- modify - superdev/references/review-contract.md (the `touched: <repo-relative path>` bullet under
  `## Notes line formats`)

### Test Commands
#### Build
- none - this repo ships markdown, JSON and bash with no build step

#### Tests
- `node --test "tests/**/*.test.ts"` - the whole suite, expect `fail 0`

### Approach
1. In each of the three bullets, keep the existing sentence and append one sentence stating that the
   line is read by `commit-task.sh`, carries the path alone - no backticks, no reason - and that the
   reason goes on its own line above it.
2. Keep each file's own voice and line width: the two agent files address the implementor in the
   second person, `review-contract.md` describes the format in the third person.
3. Change nothing else in those bullets - the `CARRY:`, `UNDERSPECIFIED:`, status-line and
   `no deviations` entries stay as they are.

### Failure modes
- none - documentation

### Contracts
- none - consumes the `touched:` grammar contract owned by Task 2

### DoD
All three files state the path-only rule for a `touched:` line; the full suite is green.


### Covered criteria
8. `superdev/agents/superbuild-task-implementor.md`,
   `superdev/agents/simplebuild-task-implementor.md` and `superdev/references/review-contract.md`
   each state that the `touched:` line is machine-read, carries the path alone, and that the reason
   belongs on its own line.
9. `node --test "tests/**/*.test.ts"` is green from the repo root.
