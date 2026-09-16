
## Task 8 - Name the task in decompose.sh criterion messages
- Covers: `Titled decompose messages` (#9)
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- `Write plan references by title and add checklist class B15` (Task 3) - blocks: the titled `Covers:` grammar the new test decomposes

### Files
- modify - superdev/scripts/decompose.sh (the `# --- kryteria akceptacji do plików tasków` loop)
- modify - tests/superdev/decompose.test.ts (the `exit 5` case, the `taskBlock` helper, one new case)

### Test Commands
#### Build
- bash -n superdev/scripts/decompose.sh

#### Tests
- node --test tests/superdev/decompose.test.ts
- node --test "tests/**/*.test.ts"

### Approach
1. In the loop, read `task_title="$(sed -n 's/^##[[:space:]]*//p' "$task_file" | head -n 1)"` before the `Covers:` grep.
2. Print the warning as `warning: \`<task_title>\` (<basename>) has no 'Covers:' criteria - none appended` and the error as `error: \`<task_title>\` (<basename>) covers criterion #<n>, absent from source: <crit_source>` with `printf '%s\n'`, so the backticks are literal.
3. Update the header comment line about `exit 5`.
4. Test: the existing `exit 5` case additionally asserts the task heading text appears in stderr; a new case, named as a guard of the titled `Covers:` grammar, decomposes a plan whose `Covers:` line reads `` - Covers: `First criterion` (#1) `` and asserts `### Covered criteria` still carries criterion 1 verbatim.

### Failure modes
- when input is invalid (a task file with no `## ` heading) -> response: the message prints an empty title between the backticks and the basename, exit code unchanged, log: the message itself, test: none - `decompose.sh` only creates task files from TASK marker blocks that always open with a heading.

### Contracts
- none

### DoD
Both messages carry the task title; the new `Covers:` grammar case passes; the whole suite is green.


### Covered criteria
9. Titled decompose messages - `decompose.sh`'s warning and error about `Covers:` name the task by its heading title plus file name, and the regression suite proves it; a plan whose `Covers:` line carries titles still decomposes.
