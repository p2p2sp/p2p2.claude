
## Task 9 - Document titled references in the superdev README and root CLAUDE.md
- Covers: `Documentation` (#10)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Print the phase title as a third column in phases-status.sh` (Task 4) - blocks: the output shape to document
- `Name tasks and findings by title in the build orchestrators` (Task 7) - blocks: the escalation wording to document

### Files
- modify - superdev/README.md (step 3 phases sentence, step 6 findings sentence)
- modify - CLAUDE.md (the superdev bullet's review-loop sentence)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- node --test "tests/**/*.test.ts"

### Approach
1. `superdev/README.md`: step 6 says findings keep stable IDs and a short title (`` `Missing timeout test` (C1) ``) and that every escalation names tasks and findings that way; step 3 says `phases <phases.md>` shows each phase's title and status.
2. Root `CLAUDE.md`: the superdev bullet's sentence on finding IDs adds the title and names `review-contract.md`'s `## Naming` section as the owner of the reference form.

### Failure modes
- none - documentation.

### Contracts
- none

### DoD
Both documents describe the titled form and the three-column status output; the suite is green.


### Covered criteria
10. Documentation - `superdev/README.md` and the root `CLAUDE.md` describe the titled finding IDs and the three-column `phases-status.sh` output.
