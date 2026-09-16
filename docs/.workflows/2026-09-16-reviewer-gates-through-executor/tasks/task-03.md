
## Task 3 - Sync the repo documentation with the new gate route
- Covers: `Docs synced` (#7)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Grant the three build reviewers the executor route` (Task 2) - blocks: the documentation states the delivered route, so it lands after that route exists.

### Files
- modify - CLAUDE.md (superdev bullet, the executor sentence)
- modify - superdev/README.md (the `executor` skill-table row)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -n "build reviewers" superdev/README.md

### Approach
1. In the root `CLAUDE.md`, extend the superdev bullet's sentence that today names only the two task implementors as the executor's callers, so it also names the three build reviewers running their gate commands the same way, and leave the sentence about the reviewers staying forks in `skills[]` as it is.
2. In `superdev/README.md`, change the `executor` row of the skill table so its clause about who routes through it names the two task implementors and the three build reviewers.

### Failure modes
- none - documentation; this task changes no instruction any worker executes.

### Contracts
- none

### DoD
The root `CLAUDE.md` and `superdev/README.md` both name the three build reviewers as executor callers; the grep finds the phrase in the README; the test suite is green.


### Covered criteria
7. Docs synced - the root `CLAUDE.md` and `superdev/README.md` both say the three build reviewers route their gate runs through the executor, alongside the two task implementors.
