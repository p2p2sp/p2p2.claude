
## Task 6 - Name decisions by their question on intent resume and in refresh.md
- Covers: `Titled decisions on resume` (#7)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form

### Files
- modify - superdev/skills/intent/SKILL.md (`## Resume from a file` first bullet, `## Refresh on resume` step 4)
- modify - superdev/skills/intent/references/refresh-template.md (`## Impact on decisions` rules and template line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/intent

#### Tests
- node --test tests/superdev/resolve-input.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. `## Resume from a file`: "ask the user whether to reopen one decision by number" becomes "ask the user whether to reopen one decision, naming each as `` `<question>` (decision <n>) ``"; the marking sentence names decisions the same way.
3. `## Refresh on resume` step 4: `## Impact on decisions` names each touched decision as `` `<question>` (decision <n>) `` - the question copied from the intent's `### <n>.` heading - and nothing else.
4. `refresh-template.md`: the content rule and the template line take that form (`` - `<question>` (decision <n>) - what about it the delta makes worth re-reading ``).

### Failure modes
- none - markdown.

### Contracts
- none

### DoD
Both files carry the form; the lint run prints `FAIL=0`; the named test file is green.


### Covered criteria
7. Titled decisions on resume - the `intent` skill asks which decision to reopen by its question, and `## Impact on decisions` lines in `refresh.md` read `` `<question>` (decision <n>) ``.
