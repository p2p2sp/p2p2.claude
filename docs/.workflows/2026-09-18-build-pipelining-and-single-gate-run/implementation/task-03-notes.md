# Task 3 - Add the concurrency column to the decompose index

## Runs
- node --test tests/superdev/decompose.test.ts -> tests 42 | pass 42 | fail 0

UNDERSPECIFIED: the predecessor's own completeness - Approach step 2 names only the task's own two sections, but with a predecessor carrying no `### Files` the overlap test is vacuously true and would print `yes` on a plan that describes nothing; `hasfiles[prev]` is therefore a fifth `yes` condition, per the header's conservative reading of missing data. Covered by the test case "... and for one whose PREDECESSOR carries no '### Files'", and stated in the script header and in the `superdev/CLAUDE.md` inventory line.
Approach step 4 also repaired a pre-existing red in `tests/superdev/decompose.test.ts` that is unrelated to the new column: the exit-7 sidecar case asserted the absolute temp path in Node's two spellings, while the script (run through Git-Bash) prints a third for the same directory (`/tmp/<mkdtemp-name>/...`); it now asserts the two trailing segments both spellings share. Verified failing at HEAD in a throwaway worktree before any edit - the task check cannot be green on a Git-Bash host without it.
Approach step 1 captures the two section-presence flags and the `(Task <N>)` / path tokens through a per-block `sec` state machine rather than three independent scans: a heading of any depth closes the section above it, so a `(Task <N>)` pointer quoted in `### Approach` prose is not read as a dependency (guarded in the "an independent successor reads yes" case).
`(Task 02)` and `(Task 2)` are the same pointer - the captured token is normalised through `d+0` before the `deps[i]` membership test.
