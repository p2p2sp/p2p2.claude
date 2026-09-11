
## Task 4 - feat(superdev): changelog-writer derives a phase-aware run id
- Covers: criteria #4
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- none - blocks: none

### Files
- modify - superdev/agents/changelog-writer.md (`## Derive`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n "phases" superdev/agents/changelog-writer.md` - expected: the run-id rule line

### Approach
1. Replace the `## Derive` bullet "Entry file: `docs/changelog/<basename of Workdir>.md`. Run id: that same basename ..." with: run id = basename of Workdir; when the parent directory of Workdir is named `phases` (the same detection rule `cleanup-run.sh` uses in Task 3), run id = `<basename of the grandparent directory>-<basename of Workdir>` (e.g. `2026-09-11-roadmap-skill-01-layout`); entry file `docs/changelog/<run id>.md`.
2. Leave every other rule untouched.

### Edge cases
- Workdir given with a trailing slash -> strip before taking basenames.

### Contracts
- `Run:` header value of a changelog entry for a phase = `<run basename>-<phase basename>`.

### DoD
The agent file states the phase rule and the grep finds it.


### Covered criteria
4. `superdev/agents/changelog-writer.md` wyprowadza identyfikator runu jako `<basename dziadka>-<basename workdiru>`, gdy rodzic workdiru nazywa się `phases`; w przeciwnym razie basename workdiru jak dziś.
