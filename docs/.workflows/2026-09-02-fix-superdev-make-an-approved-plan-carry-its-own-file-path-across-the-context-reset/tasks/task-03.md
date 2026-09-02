
## Task 3 - stop decompose.sh from orphaning its working directory on failure
- Covers: criteria #5, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/decompose.sh (between the `dir=` assignment and the first `mkdir -p`, plus a disarm before the commit section)
- modify - tests/superdev/decompose.test.ts (new cases using the existing `simplePlan` / `taskBlock` / `withGitRepo` fixtures)

### Test Commands
#### Build
- `bash -n superdev/scripts/decompose.sh`

#### Tests
- `node --test tests/superdev/decompose.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. After `dir="docs/.workflows/$(date +%F)-${slug}"` and before the first `rm -rf`/`mkdir -p`, record whether the directory already existed in a flag variable, then install an `EXIT` trap whose first statement captures `$?` and which removes `$dir` only when the status is non-zero AND the flag says this run created it, finally re-exiting with the captured status.
2. Disarm the trap with `trap - EXIT` immediately before the `--- commit dekompozycji ---` section, so a git failure leaves the fully built working directory in place rather than destroying finished work.
3. Add a `decompose.test.ts` case for exit 3: a plan with a `Title:` and a HEADER block but no TASK block asserts `status === 3`, `stderr` matching decompose.sh's exact "no ... blocks found" awk error message, and that `docs/.workflows/<date>-<slug>/` does not exist afterwards.
4. Add a case proving the exit-4 path (a `Spec:` line pointing at a missing file) likewise leaves no working directory behind.
5. Add a resume-safety case: run a valid plan to success, then re-run with a plan of the SAME title whose task blocks are removed, and assert the pre-existing working directory still exists with `status.md` and `base.md` intact.

### Edge cases
- Resume must survive: the trap may not touch a directory that existed before the run, which is what the pre-existing-directory flag encodes.
- The trap must capture `$?` as its very first statement, before any command inside the handler overwrites it.
- `rm -rf "$dir/tasks"` already runs before the trap can help on a resumed run; the trap restores nothing, it only prevents brand-new orphans - do not widen its remit.

### Contracts
- none

### DoD
`node --test tests/superdev/decompose.test.ts` is green including the three new cases, `bash -n superdev/scripts/decompose.sh` is clean, the previously asserted stdout index and resume behaviour are unchanged, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
5. `decompose.sh` removes the working directory on every non-zero exit that occurs before the decomposition commit and that this run created, and never removes a working directory that already existed before the run.
7. `node --test "tests/**/*.test.ts"` passes, including new cases for the plan-path gate (deny plus fail-open) and for `decompose.sh` exit 3 asserting no orphaned working directory.
