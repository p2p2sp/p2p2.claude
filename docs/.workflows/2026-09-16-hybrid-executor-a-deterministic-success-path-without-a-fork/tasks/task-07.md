
## Task 7 - Sync the executor documentation with the hybrid route
- Covers: `docs in sync` (#9)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Route both task implementors through the hybrid gate` (Task 4) - blocks: the docs describe the delivered route
- `Route the three build reviewers through the hybrid gate` (Task 5) - blocks: same

### Files
- modify - CLAUDE.md
- modify - superdev/README.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Rewrite the root `CLAUDE.md` sentence that says the implementors and the three build reviewers run their commands "only through the `executor` fork skill (haiku)" so it states the hybrid: a direct `run.sh` call, with the fork dispatched only on a deviation.
2. Rewrite the `executor` row of `superdev/README.md`'s skill table to name both modes and the deviation-only dispatch.
3. Change no `plugin.json` - no skill or agent is added, removed or renamed by this plan.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
Neither document claims an unconditional fork; both describe the direct call plus the deviation-only dispatch, and the suite stays green.


### Covered criteria
9. docs in sync - the root `CLAUDE.md` and `superdev/README.md` describe the hybrid route rather than an unconditional fork.
