
## Task 4 - resolve and verify the plan file in both build orchestrators
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 1 - blocks: the builds read the preamble line that Task 1 introduces

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Step 1 - Decompose Plan`)
- modify - superdev/skills/simplebuild/SKILL.md (`## Step 1 - Decompose Plan`)

### Test Commands
#### Build
- `grep -n 'Plan:' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` (repo has no build step; run this AFTER the edit - it exits 1 while the line is still absent)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In both Step 1 sections, prepend a resolution instruction: take `<plan-file>` from the `Plan:` line of the approved plan already in context, never from a `Spec:` line and never from a guessed directory.
2. Add the identity check before the `decompose.sh` call: `grep -m1 '^Title:' <plan-file>` must equal the approved plan's own `Title:` line.
3. Add the failure branch: a missing file or a differing `Title:` -> STOP, report that the plan file at that path is absent or holds a different plan (a plan-slug collision overwrote it), and do not decompose. No fallback, no rewriting the plan from context.
4. Keep both edits inside the existing Step 1 prose and its orchestrator voice - short status lines, no added prose elsewhere in either skill.

### Edge cases
- An approved plan with no `Plan:` line can only come from a pre-change plan; STOP on the same branch rather than guessing a path.
- The check reads the file with one command and does not paste plan content anywhere, preserving the orchestrators' "every value is a PATH" rule.

### Contracts
- Step 1 input contract of both builds: `<plan-file>` comes from the plan's `Plan:` line and is identity-checked against `Title:` before decomposition.

### DoD
Both Step 1 sections resolve the path from `Plan:`, verify `Title:`, and STOP on mismatch or a missing file, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
6. `superbuild` and `simplebuild` Step 1 resolve `<plan-file>` from the plan's `Plan:` line, verify the file's `Title:` against the plan in context, and STOP with an explicit message when the file is missing or holds a different plan.
